<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningCourse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningCourseUserProgress extends Base
{
    use HasFactory;

    public const STATUS_NOT_STARTED = 'not_started';
    public const STATUS_STARTED = 'started';
    public const STATUS_FINISHED = 'finished';
    public const STATUS_COMPLETED = 'completed';

    protected $table = 'learning_course_user_progress';

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'user_id',
        'learning_course_id',
        'status',
        'started_at',
        'finished_at',
        'completed_at',
        'last_visited_at',
        'progress_percent',
        'meta',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_visited_at' => 'datetime',
        'progress_percent' => 'integer',
        'meta' => 'array',
    ];

    protected $with = [
        'user',
    ];

    public static function getRules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'learning_course_id' => ['required', 'integer', 'exists:learning_courses,id'],
            'status' => ['required', 'string', 'in:' . implode(',', static::statuses())],
            'started_at' => ['nullable', 'date'],
            'finished_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'last_visited_at' => ['nullable', 'date'],
            'progress_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'meta' => ['nullable', 'array'],
        ];
    }

    public static function statuses(): array
    {
        return [
            static::STATUS_NOT_STARTED,
            static::STATUS_STARTED,
            static::STATUS_FINISHED,
            static::STATUS_COMPLETED,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(LearningCourse::class, 'learning_course_id');
    }
}

