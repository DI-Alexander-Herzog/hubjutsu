<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningCourse;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LearningBundle extends Base
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

    protected static function booted(): void
    {
        static::saving(function (LearningBundle $bundle) {
            if (!$bundle->slug && $bundle->name) {
                $bundle->slug = \Str::slug($bundle->name);
            }
        });
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(
            LearningCourse::class,
            'learning_bundle_learning_course',
            'learning_bundle_id',
            'learning_course_id'
        )->withTimestamps()->orderBy('sort');
    }
}
