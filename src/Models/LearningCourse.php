<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\HasRoleAssignments;
use AHerzog\Hubjutsu\Models\Traits\MediaTrait;
use App\Models\Base;
use App\Models\LearningBundle;
use App\Models\Media;
use App\Models\LearningModule;
use App\Models\LearningCourseUserProgress;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class LearningCourse extends Base
{
    use HasFactory, MediaTrait, HasRoleAssignments;

    protected static array $roleAssignmentAncestors = [
        'bundles',
    ];

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'name',
        'slug',
        'description',
        'body',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'bundles',
        'cover',
        'bodyImages',
    ];

    protected $fillableMedia = [
        'cover',
    ];

    protected $fillableMediaList = [
        'bodyImages',
    ];

    protected static function booted(): void
    {
        static::saving(function (LearningCourse $course) {
            if (!$course->slug && $course->name) {
                $course->slug = \Str::slug($course->name);
            }

            if (!$course->slug) {
                return;
            }

            $baseSlug = \Str::slug($course->slug) ?: \Str::slug($course->name ?: 'course');
            $slug = $baseSlug;
            $suffix = 1;

            while (static::query()
                ->where('slug', $slug)
                ->when($course->exists, fn ($q) => $q->whereKeyNot($course->getKey()))
                ->exists()
            ) {
                $slug = $baseSlug . '-' . $suffix;
                $suffix++;
            }

            $course->slug = $slug;
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

    public function bodyImages(): MorphMany
    {
        return $this->medias()
            ->where('category', 'learning_course_body_image')
            ->orderBy('mediable_sort');
    }

    public function userProgress(): HasMany
    {
        return $this->hasMany(LearningCourseUserProgress::class, 'learning_course_id');
    }

    public function setCover(Media $media): void
    {
        $this->setMedia($media, 'cover', 1);
    }

    public function setBodyImages(array $medias): void
    {
        $this->setMediaList($medias, 'learning_course_body_image', 1, true);
    }
}
