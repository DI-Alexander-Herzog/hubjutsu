<?php


namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Models\Base;
use finfo;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;
use Storage;
use Str;

/**
 * 
 *
 * @property int $id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property string $name
 * @property string $description
 * @property string|null $tags
 * @property string|null $storage
 * @property string|null $filename
 * @property int $private
 * @method static \Illuminate\Database\Eloquent\Builder|Media newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|Media newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|Media query()
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereFilename($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media wherePrivate($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereStorage($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereTags($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Media whereUpdatedBy($value)
 * @mixin \Eloquent
 */
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

    protected $casts = [
        'tags' => 'json',
        'private' => 'boolean'
    ];

    public function setTagsAttribute($val) {
        if (!$val) {
            $this->attributes['tags'] = [];
        } elseif (is_array($val))  {
            $this->attributes['tags'] = $val;
        } elseif (is_object($val)) {
            $this->attributes['tags'] = (array) $val;
        } else {
            $dec = @json_decode($val);
            if (!$dec) {
                $this->attributes['tags'] = [ $val ];
            } else {
                $this->attributes['tags'] = (array) $dec;
            }
        }
        $this->attributes['tags'] = json_encode($this->attributes['tags']);
        
    }

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
        if (!$this->mimetype) {
            $this->mimetype = finfo_buffer(new finfo(FILEINFO_MIME_TYPE), $content);
        }
        Storage::disk($this->storage)->put($this->filename, $content);
    }

}