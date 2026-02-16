<?php

namespace  AHerzog\Hubjutsu\Models\Traits;

use App\Models\Media;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Str;

trait MediaTrait
{

    public function fillableMedia(): array
    {
        return property_exists($this, 'fillableMedia') ? $this->fillableMedia  : [];
    }

    public function fillableMediaList(): array
    {
        return property_exists($this, 'fillableMediaList') ? $this->fillableMediaList  : [];
    }

    public function fillMedia(array $attributes)
    {
        foreach ($this->fillableMedia() as $key) {
            $setter = Str::camel('set_'.$key);
            $snake = Str::snake($key);

            if (!array_key_exists($snake, $attributes) || !method_exists($this, $setter)) {
                continue;
            }

            $payload = $attributes[$snake];

            if (is_array($payload) && array_is_list($payload)) {
                $payload = $payload[0] ?? null;
            }

            if ($payload === null) {
                continue;
            }

         

            $media = $this->hydrateMedia($payload, $key);
            if (!$media) {
                continue;
            }

            $this->$setter($media);
        }

        foreach ($this->fillableMediaList() as $key) {
            $setter = Str::camel('set_'.$key);
            $snake = Str::snake($key);

            if (!array_key_exists($snake, $attributes) || !method_exists($this, $setter)) {
                continue;
            }

            $payload = $attributes[$snake];
            if ($payload === null) {
                continue;
            }

            if (!is_array($payload) || !array_is_list($payload)) {
                $payload = [$payload];
            }

            $this->$setter($payload);
        }
    }

    public function medias() {
        return $this->morphMany(Media::class, 'mediable');
    }

    /**
     * @return MorphOne
     */
    public function media($category='main'): MorphOne
    {
        return $this->morphOne(Media::class, 'mediable')->ofMany([
            'mediable_sort' => 'min',
        ], function (Builder $query) use($category){
            $query->where('category', $category);
        });
    }


    public function setMedia(mixed $media, $category="main", $sort=1) {
        $media = $this->hydrateMedia($media, $category);
        if (!$media) {
            return;
        }

        $existingRecord = $this->medias()->where('category', $category)->latest()->first();
        /** @var Media $media */
        if ($media->mediable) {
            get_class($this) == get_class($media->mediable) || throw new \Exception("Media already has another mediable");
            $this->getKey() == $media->mediable->getKey() || throw new \Exception("Media already has annother mediable");
        }

        if($existingRecord) {
            if (!$media->getKey()) {
                $existingRecord->fill($media->toArray());
            }
            if ($existingRecord->getKey() != $media->getKey() ) {
                $existingRecord->delete();
            }
        }

        $media->category = $category;
        $media->mediable_sort = $sort;
        $media->mediable()->associate($this);
        $media->save();
    }

    public function setMediaList(array $medias, $category="main", $sortStart=1): void
    {
        foreach ($medias as $idx => $media) {
            if (!$media) {
                continue;
            }

            $entryMedia = $this->hydrateMedia($media, $category);
            if (!$entryMedia) {
                continue;
            }

            if ($entryMedia->mediable) {
                get_class($this) == get_class($entryMedia->mediable) || throw new \Exception("Media already has another mediable");
                $this->getKey() == $entryMedia->mediable->getKey() || throw new \Exception("Media already has annother mediable");
            }

            $sort = is_array($media) && isset($media['mediable_sort'])
                ? intval($media['mediable_sort'])
                : $sortStart + $idx;

            $entryMedia->category = $category;
            $entryMedia->mediable_sort = $sort;
            $entryMedia->mediable()->associate($this);
            $entryMedia->save();
        }
    }

    public function addMedia(Media $media, $category="main", $sort=1) {
        if ($media->mediable) {
            get_class($this) == get_class($media->mediable) || throw new \Exception("Media already has another mediable");
            $this->getKey() == $media->mediable->getKey() || throw new \Exception("Media already has annother mediable");
        }

        $media->category = $category;
        $media->mediable_sort = $sort;
        $media->mediable()->associate($this);
        $media->save();
    }

    protected function hydrateMedia(mixed $media, ?string $category = null): ?Media
    {
        if ($media instanceof Media) {
            return $media;
        }

        if (!is_array($media)) {
            return null;
        }

        if (!empty($media[Media::DELETE_FLAG])) {
            if ($category !== null) {
                if (!empty($media['id'])) {
                    $toDelete = $this->medias()
                        ->where('category', $category)
                        ->whereKey($media['id'])
                        ->first();
                    if ($toDelete) {
                        $toDelete->delete();
                    }
                } else {
                    $this->media($category)->delete();
                }
            }
            return null;
        }

        if (isset($media['id'])) {
            $data = $media;
            $mediaObj = Media::find($data['id']);
            if (!$mediaObj) {
                return null;
            }
            $mediaObj->fill($data);
            return $mediaObj;
        }

        return new Media($media);
    }
}
