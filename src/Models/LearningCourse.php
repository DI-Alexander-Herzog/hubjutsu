<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\MediaTrait;
use App\Models\Base;
use App\Models\LearningBundle;
use App\Models\Media;
use App\Models\LearningModule;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class LearningCourse extends Base
{
    use HasFactory, MediaTrait;

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'name',
        'slug',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'bundles',
        'cover',
    ];

    protected $fillableMedia = [
        'cover',
    ];

    protected static function booted(): void
    {
        static::saving(function (LearningCourse $course) {
            if (!$course->slug && $course->name) {
                $course->slug = \Str::slug($course->name);
            }
        });
    }

    public function bundles(): BelongsToMany
    {
        return $this->belongsToMany(
            LearningBundle::class,
            'learning_bundle_learning_course',
            'learning_course_id',
            'learning_bundle_id'
        )->withPivot('sort')->withTimestamps()->orderByPivot('sort');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(LearningModule::class)->orderBy('sort');
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
