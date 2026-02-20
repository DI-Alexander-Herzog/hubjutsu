<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningCourse;
use App\Models\LearningSection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningModule extends Base
{
    use HasFactory;

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
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'course',
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
}
