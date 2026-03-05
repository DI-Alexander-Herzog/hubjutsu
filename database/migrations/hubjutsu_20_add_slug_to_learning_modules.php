<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_modules', function (Blueprint $table) {
            $table->string('slug')->default('')->after('name');
        });

        $modules = DB::table('learning_modules')
            ->select(['id', 'learning_course_id', 'name'])
            ->orderBy('learning_course_id')
            ->orderBy('id')
            ->get();

        $usedSlugsByCourse = [];

        foreach ($modules as $module) {
            $courseId = intval($module->learning_course_id);
            $baseSlug = Str::slug($module->name ?: 'module');
            if ($baseSlug === '') {
                $baseSlug = 'module';
            }

            $slug = $baseSlug;
            $suffix = 1;

            while (isset($usedSlugsByCourse[$courseId][$slug])) {
                $slug = $baseSlug . '-' . $suffix;
                $suffix++;
            }

            $usedSlugsByCourse[$courseId][$slug] = true;

            DB::table('learning_modules')
                ->where('id', $module->id)
                ->update(['slug' => $slug]);
        }

        Schema::table('learning_modules', function (Blueprint $table) {
            $table->unique(['learning_course_id', 'slug'], 'learning_modules_course_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::table('learning_modules', function (Blueprint $table) {
            $table->dropUnique('learning_modules_course_slug_unique');
            $table->dropColumn('slug');
        });
    }
};

