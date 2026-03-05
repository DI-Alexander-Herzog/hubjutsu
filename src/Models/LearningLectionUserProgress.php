<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningLection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningLectionUserProgress extends Base
{
    use HasFactory;

    public const STATUS_NOT_STARTED = 'not_started';
    public const STATUS_STARTED = 'started';
    public const STATUS_FINISHED = 'finished';
    public const STATUS_COMPLETED = 'completed';

    protected $table = 'learning_lection_user_progress';

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'user_id',
        'learning_lection_id',
        'status',
        'started_at',
        'finished_at',
        'completed_at',
        'video_position_seconds',
        'watched_seconds',
        'last_watched_at',
        'meta',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_watched_at' => 'datetime',
        'video_position_seconds' => 'integer',
        'watched_seconds' => 'integer',
        'meta' => 'array',
    ];

    protected $with = [
        'user',
    ];

    public static function getRules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'learning_lection_id' => ['required', 'integer', 'exists:learning_lections,id'],
            'status' => ['required', 'string', 'in:' . implode(',', static::statuses())],
            'started_at' => ['nullable', 'date'],
            'finished_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'video_position_seconds' => ['nullable', 'integer', 'min:0'],
            'watched_seconds' => ['nullable', 'integer', 'min:0'],
            'last_watched_at' => ['nullable', 'date'],
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

    public function lection(): BelongsTo
    {
        return $this->belongsTo(LearningLection::class, 'learning_lection_id');
    }
}

