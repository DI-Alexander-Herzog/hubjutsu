<?php

use App\Models\LearningCourse;
use App\Models\LearningModule;
use App\Models\LearningSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_bundles', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort')->default(0);
        });

        Schema::create('learning_courses', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
        });

        Schema::create('learning_bundle_learning_course', function (Blueprint $table) {
            $table->id();
            $table->timestamps();

            $table->foreignId('learning_bundle_id')
                ->constrained('learning_bundles')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('learning_course_id')
                ->constrained('learning_courses')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->unsignedInteger('sort')->default(0);
             

            $table->unique(['learning_bundle_id', 'learning_course_id'], 'learning_bundle_course_unique');
        });

        Schema::create('learning_modules', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->foreignIdFor(LearningCourse::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort')->default(0);
        });

        Schema::create('learning_sections', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->foreignIdFor(LearningModule::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort')->default(0);
        });

        Schema::create('learning_lections', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->foreignIdFor(LearningSection::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();
            $table->longText('content')->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_lections');
        Schema::dropIfExists('learning_sections');
        Schema::dropIfExists('learning_modules');
        Schema::dropIfExists('learning_bundle_learning_course');
        Schema::dropIfExists('learning_courses');
        Schema::dropIfExists('learning_bundles');
    }
};
