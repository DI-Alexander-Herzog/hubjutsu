<?php

use App\Models\Hub;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TARGET_TABLE = 'role_assignments';
    private const TEMP_TABLE = 'role_assignments_tmp';

    public function up(): void
    {
        $sourceTable = $this->resolveSourceTable();

        if (! $sourceTable) {
            return;
        }

        $workingTable = $this->prepareWorkingTable($sourceTable);

        $this->ensureIdColumn($workingTable);
        $this->dropLegacyHubForeign($workingTable);
        $this->renameHubColumn($workingTable);
        $this->ensureScopeType($workingTable);
        $this->deduplicateAssignments($workingTable);
        $this->ensureIndexes($workingTable);

        if ($workingTable === self::TEMP_TABLE) {
            Schema::rename(self::TEMP_TABLE, self::TARGET_TABLE);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable(self::TARGET_TABLE)) {
            return;
        }

        Schema::table(self::TARGET_TABLE, function (Blueprint $blueprint) {
            if ($this->hasIndex(self::TARGET_TABLE, 'role_assignments_scope_index')) {
                $blueprint->dropIndex('role_assignments_scope_index');
            }

            if ($this->hasIndex(self::TARGET_TABLE, 'role_assignments_user_id_index')) {
                $blueprint->dropIndex('role_assignments_user_id_index');
            }

            if ($this->hasIndex(self::TARGET_TABLE, 'role_assignments_unique')) {
                $blueprint->dropUnique('role_assignments_unique');
            }
        });

        Schema::table(self::TARGET_TABLE, function (Blueprint $blueprint) {
            if (Schema::hasColumn(self::TARGET_TABLE, 'scope_type')) {
                $blueprint->dropColumn('scope_type');
            }

            if (Schema::hasColumn(self::TARGET_TABLE, 'scope_id') && ! Schema::hasColumn(self::TARGET_TABLE, 'hub_id')) {
                $blueprint->renameColumn('scope_id', 'hub_id');
            }
        });

        if (Schema::hasTable(self::TARGET_TABLE) && Schema::hasColumn(self::TARGET_TABLE, 'hub_id')) {
            Schema::table(self::TARGET_TABLE, function (Blueprint $blueprint) {
                $blueprint->foreign('hub_id')
                    ->references('id')
                    ->on((new Hub())->getTable())
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();
            });
        }

        $fallback = Schema::hasTable('hub_user_roles') ? 'user_hub_roles' : 'hub_user_roles';

        if (! Schema::hasTable($fallback)) {
            Schema::rename(self::TARGET_TABLE, $fallback);
        }
    }

    private function resolveSourceTable(): ?string
    {
        foreach ([self::TARGET_TABLE, self::TEMP_TABLE, 'hub_user_roles', 'user_hub_roles'] as $table) {
            if (Schema::hasTable($table)) {
                return $table;
            }
        }

        return null;
    }

    private function prepareWorkingTable(string $sourceTable): string
    {
        if (in_array($sourceTable, [self::TARGET_TABLE, self::TEMP_TABLE], true)) {
            return $sourceTable;
        }

        Schema::rename($sourceTable, self::TEMP_TABLE);

        return self::TEMP_TABLE;
    }

    private function ensureIdColumn(string $table): void
    {
        if (Schema::hasColumn($table, 'id')) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->bigIncrements('id')->first();
        });
    }

    private function dropLegacyHubForeign(string $table): void
    {
        if (! Schema::hasColumn($table, 'hub_id')) {
            return;
        }

        if (! $this->hasForeignKey($table, 'hub_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->dropForeign([$this->legacyHubColumn()]);
        });
    }

    private function renameHubColumn(string $table): void
    {
        if (Schema::hasColumn($table, 'scope_id') || ! Schema::hasColumn($table, 'hub_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->renameColumn('hub_id', 'scope_id');
        });
    }

    private function ensureScopeType(string $table): void
    {
        $hubMorph = (new Hub())->getMorphClass();

        if (! Schema::hasColumn($table, 'scope_type')) {
            Schema::table($table, function (Blueprint $blueprint) use ($hubMorph) {
                $blueprint->string('scope_type')->default($hubMorph)->after('role_id');
            });
        }

        DB::table($table)
            ->whereNull('scope_type')
            ->update(['scope_type' => $hubMorph]);
    }

    private function ensureIndexes(string $table): void
    {
        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (! $this->hasIndex($table, 'role_assignments_scope_index')) {
                $blueprint->index(['scope_type', 'scope_id'], 'role_assignments_scope_index');
            }

            if (! $this->hasIndex($table, 'role_assignments_user_id_index')) {
                $blueprint->index('user_id', 'role_assignments_user_id_index');
            }

            if (! $this->hasIndex($table, 'role_assignments_unique')) {
                $blueprint->unique(['user_id', 'role_id', 'scope_type', 'scope_id'], 'role_assignments_unique');
            }
        });

        if ($this->hasForeignKey($table, 'user_id') === false) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('user_id')->references('id')->on((new User())->getTable())->cascadeOnUpdate()->cascadeOnDelete();
            });
        }

        if ($this->hasForeignKey($table, 'role_id') === false) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('role_id')->references('id')->on((new Role())->getTable())->cascadeOnUpdate()->cascadeOnDelete();
            });
        }
    }

    private function deduplicateAssignments(string $table): void
    {
        $duplicates = DB::table($table)
            ->select('user_id', 'role_id', 'scope_type', 'scope_id', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('user_id', 'role_id', 'scope_type', 'scope_id')
            ->having('aggregate', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            $ids = DB::table($table)
                ->where('user_id', $duplicate->user_id)
                ->where('role_id', $duplicate->role_id)
                ->where('scope_type', $duplicate->scope_type)
                ->where('scope_id', $duplicate->scope_id)
                ->orderBy('id')
                ->pluck('id')
                ->toArray();

            array_shift($ids);

            if ($ids) {
                DB::table($table)->whereIn('id', $ids)->delete();
            }
        }
    }

    private function hasForeignKey(string $table, string $column): bool
    {
        $details = $this->getDoctrineTable($table);

        if (! $details) {
            return false;
        }

        foreach ($details->getForeignKeys() as $foreignKey) {
            if (in_array($column, $foreignKey->getLocalColumns(), true)) {
                return true;
            }
        }

        return false;
    }

    private function hasIndex(string $table, string $index): bool
    {
        $details = $this->getDoctrineTable($table);

        if (! $details) {
            return false;
        }

        return $details->hasIndex($index);
    }

    private function legacyHubColumn(): string
    {
        return 'hub_id';
    }

    private function getDoctrineTable(string $table): ?object
    {
        $connection = Schema::getConnection();

        if (! method_exists($connection, 'getDoctrineSchemaManager')) {
            return null;
        }

        return $connection->getDoctrineSchemaManager()->listTableDetails($table);
    }
};
