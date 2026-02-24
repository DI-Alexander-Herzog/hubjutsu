<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_courses', function (Blueprint $table) {
            if (!Schema::hasColumn('learning_courses', 'body')) {
                $table->longText('body')->nullable()->after('description');
            }
        });

        Schema::table('learning_modules', function (Blueprint $table) {
            if (!Schema::hasColumn('learning_modules', 'unlock_mode')) {
                $table->string('unlock_mode', 40)->default('none')->after('sort');
            }
            if (!Schema::hasColumn('learning_modules', 'unlock_delay_days')) {
                $table->unsignedInteger('unlock_delay_days')->default(0)->after('unlock_mode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('learning_modules', function (Blueprint $table) {
            if (Schema::hasColumn('learning_modules', 'unlock_delay_days')) {
                $table->dropColumn('unlock_delay_days');
            }
            if (Schema::hasColumn('learning_modules', 'unlock_mode')) {
                $table->dropColumn('unlock_mode');
            }
        });

        Schema::table('learning_courses', function (Blueprint $table) {
            if (Schema::hasColumn('learning_courses', 'body')) {
                $table->dropColumn('body');
            }
        });
    }
};
