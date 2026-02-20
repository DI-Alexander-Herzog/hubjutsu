<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningLection;
use App\Models\LearningModule;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningSection extends Base
{
    use HasFactory;

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'learning_module_id',
        'name',
        'description',
        'active',
        'sort',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'module',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(LearningModule::class, 'learning_module_id');
    }

    public function lections(): HasMany
    {
        return $this->hasMany(LearningLection::class)->orderBy('sort');
    }
}
