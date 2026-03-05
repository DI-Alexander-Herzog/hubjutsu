<?php

namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\MediaTrait;
use App\Models\Base;
use App\Models\Media;
use App\Models\LearningLectionUserProgress;
use App\Models\LearningSection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class LearningLection extends Base
{
    use HasFactory, MediaTrait;

    protected static function booted(): void
    {
        static::saving(function (LearningLection $lection) {
            if (!empty($lection->sort) && intval($lection->sort) !== 0) {
                return;
            }

            $maxSort = static::query()
                ->where('learning_section_id', $lection->learning_section_id)
                ->when($lection->exists, fn ($q) => $q->whereKeyNot($lection->getKey()))
                ->max('sort');

            $lection->sort = intval($maxSort ?? 0) + 10;
        });
    }

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

    protected $fillableMedia = [
        'image',
        'video',
    ];

    protected $fillableMediaList = [
        'attachments',
    ];

    protected $with = [
        'section',
        'image',
        'video',
        'attachments',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(LearningSection::class, 'learning_section_id');
    }

    public function image(): MorphOne
    {
        return $this->media('lection_image');
    }

    public function video(): MorphOne
    {
        return $this->media('lection_video');
    }

    public function attachments(): MorphMany
    {
        return $this->medias()
            ->where('category', 'lection_attachment')
            ->orderBy('mediable_sort');
    }

    public function userProgress(): HasMany
    {
        return $this->hasMany(LearningLectionUserProgress::class, 'learning_lection_id');
    }

    public function setImage(Media $media): void
    {
        $this->setMedia($media, 'lection_image', 1);
    }

    public function setVideo(Media $media): void
    {
        $this->setMedia($media, 'lection_video', 1);
    }

    public function setAttachments(array $medias): void
    {
        $this->setMediaList($medias, 'lection_attachment', 1);
    }
}
