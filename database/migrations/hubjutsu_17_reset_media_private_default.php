<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('media')) {
            return;
        }

        // One-time cleanup for legacy installs where private was persisted as 1.
        DB::table('media')->update(['private' => 0]);

        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE media MODIFY private TINYINT(1) NOT NULL DEFAULT 0');
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE media ALTER COLUMN private SET DEFAULT false');
            DB::statement('ALTER TABLE media ALTER COLUMN private SET NOT NULL');
        }
    }

    public function down(): void
    {
        // Intentional no-op: data cleanup is not reversible.
    }
};

