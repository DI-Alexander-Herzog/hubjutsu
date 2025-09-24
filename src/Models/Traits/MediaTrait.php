<?php

namespace  AHerzog\Hubjutsu\Models\Traits;

use App\Models\Address;
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

    public function fillMedia(array $attributes)
    {
        foreach ($this->fillableMedia() as $key) {
            
            $setter = Str::camel('set_'.$key);
            $snake = Str::snake($key);
            
            if (isset($attributes[$snake]) && method_exists($this, $setter)) {
                $media = $attributes[$snake];
                 if (is_array($media)) {
                    if (isset($media['id'])) {
                        $data = $media;
                        $media = Media::find($data['id']);
                        $media->fill($data);
                    } else {
                        $media = new Media($media);
                    }
                }
                $this->$setter($media);
            }
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
    

    public function setMedia(Media|array $media, $category="main", $sort=1) {
        if (is_array($media)) {
            if (isset($media['id'])) {
                $data = $media;
                $media = Media::find($data['id']);
                $media->fill($data);
            } else {
                $media = new Media($media);
            }
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

}