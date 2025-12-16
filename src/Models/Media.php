<?php


namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Models\Base;
use File;
use finfo;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;
use Illuminate\Http\UploadedFile;
use phpDocumentor\Reflection\DocBlock\Tags\Var_;
use Storage;
use Str;
use Symfony\Component\Mime\MimeTypes;

/**
 * @property int $id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property string $name
 * @property string $description
 * @property array<array-key, mixed>|null $tags
 * @property string|null $storage
 * @property string|null $filename
 * @property bool $private
 * @property string|null $mimetype
 * @property string|null $mediable_type
 * @property int|null $mediable_id
 * @property int|null $mediable_sort
 * @property string|null $category
 * @property-read mixed $thumbnail
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent|null $mediable
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media query()
 * @method static Builder<static>|Media search($term)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereFilename($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereMediableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereMediableSort($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereMediableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereMimetype($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media wherePrivate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereStorage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereTags($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Media whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class Media extends Base {
    use UserTrait, HasTimestamps;
    public const DELETE_FLAG = '__DELETE';

    protected static function boot()
    {
        parent::boot();

        static::saved(function (Media $media) {
            $media->relocateFileIfNecessary();
        });
        static::deleting(function (Media $media) {
            $media->deleteStoredFile();
        });
    }

    protected $fillable = [
        'name',
        'description',
        'tags',
        'storage',
        'filename',
        'private',
        'mimetype',
        'category'
    ];

    protected $casts = [
        'tags' => 'json',
        'private' => 'boolean'
    ];

    protected $appends = [
        'thumbnail'
    ];

    
    public function mediable() {
        return $this->morphTo();
    }

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

    public function getThumbnailAttribute() {
        if (in_array($this->mimetype, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
            return $this->getUrl();
        }
        return null;
    }

    public function getUrl() {
        return Storage::disk($this->storage)->url($this->filename);
    }

    public function getPath() {
        return Storage::disk($this->storage)->path($this->filename);
    }

    protected function deleteStoredFile(): void
    {
        if (!$this->storage || !$this->filename) {
            return;
        }

        try {
            if (Storage::disk($this->storage)->exists($this->filename)) {
                Storage::disk($this->storage)->delete($this->filename);
            }
        } catch (\Throwable $e) {
            // Ignore file deletion errors to avoid breaking delete flow
        }
    }

    protected function relocateFileIfNecessary(): void
    {
        $currentStorage = $this->storage;
        $file = $this->filename;
        $category = $this->category;

        $disks = config("filesystems.disks");
        $filenamePrefix = "";
        if (!isset($disks[$category])) {
            $filenamePrefix = '/' . $category;
            $storage = 'public';
        } else {
            $storage = $category;
        }

        if ($currentStorage !== $storage || ($category && !str_starts_with($file, $filenamePrefix . '/'))) {
            $contents = Storage::disk($currentStorage)->get($file);
            $newFilename = $filenamePrefix . '/' . $this->created_at->format('Y/m') . '/' . basename($file);
            Storage::disk($storage)->put($newFilename, $contents);
            $this->storage = $storage;
            $this->filename = $newFilename;
            $this->save();
            Storage::disk($currentStorage)->delete($file);
        }

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

    static function fromUrl($url, $type='media', $storage="public", $private=true) {
        $contents = file_get_contents($url);
        
        $ext = pathinfo($url, PATHINFO_EXTENSION);
        $title = urldecode(basename(parse_url($url, PHP_URL_PATH), '.' . $ext));
        $file = md5($contents).'/'. $title . '.' . $ext;

        Storage::disk('local')->put($file, $contents);

        return self::fromPath(Storage::disk('local')->path($file), $type, $storage, $private);
    }
    
    static function fromPath($path, $type='media', $storage="public", $private=true) {
        if (!file_exists($path)) {
            throw new \InvalidArgumentException("File $path does not exist");
        }

        $filenamePrefix = "";
        $disks = config("filesystems.disks");
        if (!isset($disks[$storage])) {
            $filenamePrefix = '/' . $storage;
            $storage = 'public';
        }
        
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $title = basename($path, '.' . $ext);

        $media = new \App\Models\Media([
            'name' => $title,
            'description' => $title,
            'tags' => [$type],
            'storage' => $storage,
            'filename' => $filenamePrefix . '/' . Str::slug($type) . '/' . date('Y/m') . '/' . $title. '.' . $ext,
            'private' => $private,
        ]);
        $media->save();
        $media->setContent(file_get_contents($path));
        $media->save();

        return $media;
    }

}
