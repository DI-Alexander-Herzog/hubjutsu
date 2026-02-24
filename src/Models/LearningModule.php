<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\MediaTrait;
use App\Models\Base;
use App\Models\LearningCourse;
use App\Models\Media;
use App\Models\LearningSection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class LearningModule extends Base
{
    use HasFactory, MediaTrait;

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'learning_course_id',
        'name',
        'description',
        'active',
        'sort',
        'unlock_mode',
        'unlock_delay_days',
    ];

    protected $casts = [
        'active' => 'boolean',
        'unlock_delay_days' => 'integer',
    ];

    protected $with = [
        'course',
        'cover',
    ];

    protected $fillableMedia = [
        'cover',
    ];

    protected static function booted(): void
    {
        static::saving(function (LearningModule $module) {
            if (!empty($module->sort) && intval($module->sort) !== 0) {
                return;
            }

            $module->sort = static::query()
                ->where('learning_course_id', $module->learning_course_id)
                ->when($module->exists, fn ($q) => $q->whereKeyNot($module->getKey()))
                ->count() + 1;
            $module->sort *= 10;
        });
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(LearningCourse::class, 'learning_course_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(LearningSection::class)->orderBy('sort');
    }

    public function cover(): MorphOne
    {
        return $this->media('cover');
    }

    public function setCover(Media $media): void
    {
        $this->setMedia($media, 'cover', 1);
    }
}
