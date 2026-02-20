<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningBundle;
use App\Models\LearningModule;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningCourse extends Base
{
    use HasFactory;

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'name',
        'slug',
        'description',
        'active',
        'sort',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'bundles',
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
        )->withTimestamps()->orderBy('name');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(LearningModule::class)->orderBy('sort');
    }
}
