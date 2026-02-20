<?php

namespace AHerzog\Hubjutsu\Models;

use App\Models\Base;
use App\Models\LearningSection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningLection extends Base
{
    use HasFactory;

    protected $fillable = [
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'learning_section_id',
        'name',
        'description',
        'content',
        'duration_minutes',
        'active',
        'sort',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $with = [
        'section',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(LearningSection::class, 'learning_section_id');
    }
}
