<?php


namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Models\Base;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;
use Storage;
use Str;

class Media extends Base {
    use UserTrait, HasTimestamps;

    protected $fillable = [
        'name',
        'description',
        'tags',
        'storage',
        'filename',
        'private',
        'mimetype'
    ];

    public function getUrl() {
        return Storage::disk($this->storage)->url($this->filename);
    }

    public function getPath() {
        return Storage::disk($this->storage)->path($this->filename);
    }

    public function setContent($content, $filename=null) {
        if (!$filename) {
            if (!$this->filename) {
                $filename = Str::slug($this->name);
            } else {
                $filename = $this->filename;
            }
        }
        $this->filename = $filename;
        if (!$this->storage) {
            $this->storage = 'public';
        }
        Storage::disk($this->storage)->put($this->filename, $content);
    }

}