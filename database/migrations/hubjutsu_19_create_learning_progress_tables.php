<?php

use App\Models\LearningCourse;
use App\Models\LearningLection;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_course_user_progress', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->foreignIdFor(User::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignIdFor(LearningCourse::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('status', 32)->default('not_started');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_visited_at')->nullable();
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->json('meta')->nullable();

            $table->unique(['user_id', 'learning_course_id'], 'learning_course_user_progress_unique');
            $table->index(['learning_course_id', 'status'], 'learning_course_user_progress_course_status_idx');
        });

        Schema::create('learning_lection_user_progress', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->user();

            $table->foreignIdFor(User::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignIdFor(LearningLection::class)
                ->constrained()
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('status', 32)->default('not_started');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('video_position_seconds')->default(0);
            $table->unsignedInteger('watched_seconds')->default(0);
            $table->timestamp('last_watched_at')->nullable();
            $table->json('meta')->nullable();

            $table->unique(['user_id', 'learning_lection_id'], 'learning_lection_user_progress_unique');
            $table->index(['learning_lection_id', 'status'], 'learning_lection_user_progress_lection_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_lection_user_progress');
        Schema::dropIfExists('learning_course_user_progress');
    }
};

