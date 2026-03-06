<?php

use App\Models\Hub;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $table = (new Hub())->getTable();

        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (Schema::hasColumn($table, 'role_id')) {
                return;
            }

            $blueprint->foreignIdFor(Role::class, 'role_id')
                ->nullable()
                ->after('primary')
                ->constrained()
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });

        DB::table($table)
            ->whereNull('role_id')
            ->update(['role_id' => null]);

        Hub::query()->get()->each(function (Hub $hub) {
            $hub->ensureDefaultRole();
        });
    }

    public function down(): void
    {
        $table = (new Hub())->getTable();

        if (!Schema::hasColumn($table, 'role_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->dropForeign(['role_id']);
            $blueprint->dropColumn('role_id');
        });
    }
};
