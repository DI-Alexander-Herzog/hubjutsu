<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\HasRoleAssignments;
use App\Models\Base;
use App\Models\LearningCourse;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LearningBundle extends Base
{
    use HasFactory, HasRoleAssignments;

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
            if (empty($bundle->sort) || intval($bundle->sort) === 0) {
                $bundle->sort = static::query()
                    ->when($bundle->exists, fn ($q) => $q->whereKeyNot($bundle->getKey()))
                    ->count() + 1;
                $bundle->sort *= 10;
            }

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
        )->withPivot('sort')->withTimestamps()->orderByPivot('sort');
    }

    public static function getRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
