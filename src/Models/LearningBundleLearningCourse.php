<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningBundle;
use App\Models\LearningCourse;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningBundleLearningCourse extends Base
{
    use HasFactory;

    protected $table = 'learning_bundle_learning_course';

    protected $fillable = [
        'learning_bundle_id',
        'learning_course_id',
        'sort',
    ];

    protected $casts = [
        'sort' => 'integer',
    ];

    protected $with = [
        'course',
    ];

    protected static function booted(): void
    {
        static::saving(function (LearningBundleLearningCourse $assignment) {
            if (!empty($assignment->sort) && intval($assignment->sort) !== 0) {
                return;
            }

            $assignment->sort = static::query()
                ->where('learning_bundle_id', $assignment->learning_bundle_id)
                ->when($assignment->exists, fn ($q) => $q->whereKeyNot($assignment->getKey()))
                ->count() + 1;
            $assignment->sort *= 10;
        });
    }

    public static function getRules(): array
    {
        return [
            'learning_bundle_id' => ['required', 'integer', 'exists:learning_bundles,id'],
            'learning_course_id' => ['required', 'integer', 'exists:learning_courses,id'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(LearningBundle::class, 'learning_bundle_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(LearningCourse::class, 'learning_course_id');
    }
}
