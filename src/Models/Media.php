<?php


namespace AHerzog\Hubjutsu\Models;

use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Models\Base;
use File;
use finfo;
use Imagick;
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
 * @property array<array-key, mixed>|null $meta
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
        'category',
        'meta',
    ];

    protected $casts = [
        'tags' => 'json',
        'private' => 'boolean',
        'meta' => 'array',
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
            $thumbPath = data_get($this->meta, 'image.variants.thumb.path');
            if (is_string($thumbPath) && $thumbPath !== '' && $this->storage) {
                $normalizedThumbPath = ltrim($thumbPath, '/');
                if (Storage::disk($this->storage)->exists($normalizedThumbPath)) {
                    if (\Illuminate\Support\Facades\Route::has('media.variant')) {
                        return route('media.variant', [$this->getKey(), 'thumb']);
                    }
                    return Storage::disk($this->storage)->url($normalizedThumbPath);
                }
            }
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
            // Keep each media file in its own scoped folder to avoid filename collisions on relocate.
            $newFilename = $filenamePrefix
                . '/'
                . $this->created_at->format('Y/m')
                . '/'
                . $this->getKey()
                . '/'
                . basename($file);
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

    public function generateImageVariants(): void
    {
        if (!$this->mimetype || !str_starts_with((string) $this->mimetype, 'image/')) {
            return;
        }
        if (!class_exists(Imagick::class)) {
            return;
        }
        if (!$this->storage || !$this->filename || !Storage::disk($this->storage)->exists($this->filename)) {
            return;
        }

        $sourcePath = $this->getPath();
        $image = new Imagick($sourcePath);
        $image->autoOrient();

        $width = (int) $image->getImageWidth();
        $height = (int) $image->getImageHeight();
        if ($width <= 0 || $height <= 0) {
            $image->clear();
            $image->destroy();
            return;
        }

        $cropMeta = (array) data_get($this->meta, 'image.crop', []);
        $cropX = max(0, min(100, (float) ($cropMeta['x'] ?? 0)));
        $cropY = max(0, min(100, (float) ($cropMeta['y'] ?? 0)));
        $cropW = max(0.1, min(100, (float) ($cropMeta['w'] ?? 100)));
        $cropH = max(0.1, min(100, (float) ($cropMeta['h'] ?? 100)));
        $cropAspect = (string) ($cropMeta['aspect'] ?? 'free');

        $x = (int) floor(($cropX / 100) * $width);
        $y = (int) floor(($cropY / 100) * $height);
        $w = (int) max(1, floor(($cropW / 100) * $width));
        $h = (int) max(1, floor(($cropH / 100) * $height));

        if ($x + $w > $width) $w = $width - $x;
        if ($y + $h > $height) $h = $height - $y;
        if ($w <= 0 || $h <= 0) {
            $image->clear();
            $image->destroy();
            return;
        }

        $targetPixelRatio = $this->resolvePixelAspectRatio($cropAspect, $width, $height);
        if ($targetPixelRatio) {
            $currentRatio = $w / $h;
            if ($currentRatio > $targetPixelRatio) {
                $newW = (int) max(1, floor($h * $targetPixelRatio));
                $x += (int) floor(($w - $newW) / 2);
                $w = $newW;
            } else {
                $newH = (int) max(1, floor($w / $targetPixelRatio));
                $y += (int) floor(($h - $newH) / 2);
                $h = $newH;
            }
            if ($x + $w > $width) $x = max(0, $width - $w);
            if ($y + $h > $height) $y = max(0, $height - $h);
        }

        $image->cropImage($w, $h, $x, $y);
        $image->setImagePage(0, 0, 0, 0);

        $sizes = [
            'big' => 1600,
            'med' => 900,
            'thumb' => 300,
        ];

        $ext = strtolower((string) pathinfo($this->filename, PATHINFO_EXTENSION));
        if (!$ext) {
            $ext = 'jpg';
        }
        $baseName = pathinfo($this->filename, PATHINFO_FILENAME);
        $directory = trim((string) dirname($this->filename), '/');
        $variantDir = ($directory ? $directory . '/' : '') . 'variants';
        Storage::disk($this->storage)->makeDirectory($variantDir);

        // Remove previously generated variants so stale files are not kept when sizes are skipped.
        $existingVariants = (array) data_get($this->meta, 'image.variants', []);
        foreach ($existingVariants as $existingVariant) {
            $existingPath = is_array($existingVariant) ? ($existingVariant['path'] ?? null) : null;
            if (!is_string($existingPath) || !$existingPath) {
                continue;
            }
            $existingPath = ltrim($existingPath, '/');
            if (Storage::disk($this->storage)->exists($existingPath)) {
                Storage::disk($this->storage)->delete($existingPath);
            }
        }

        $variants = [];
        foreach ($sizes as $name => $maxSize) {
            $variant = clone $image;
            $srcW = (int) $variant->getImageWidth();
            $srcH = (int) $variant->getImageHeight();
            if ($srcW <= 0 || $srcH <= 0) {
                $variant->clear();
                $variant->destroy();
                continue;
            }

            // No upsampling for big/med, but always generate thumb (even if upscaling is needed).
            if ($name !== 'thumb' && max($srcW, $srcH) < $maxSize) {
                $variant->clear();
                $variant->destroy();
                continue;
            }

            if ($srcW >= $srcH) {
                $targetW = $maxSize;
                $targetH = (int) max(1, round(($srcH / $srcW) * $maxSize));
            } else {
                $targetH = $maxSize;
                $targetW = (int) max(1, round(($srcW / $srcH) * $maxSize));
            }

            $variant->resizeImage($targetW, $targetH, Imagick::FILTER_LANCZOS, 1, true);

            $variantPath = $variantDir . '/' . $baseName . '-' . $name . '.' . $ext;
            $variant->writeImage(Storage::disk($this->storage)->path($variantPath));

            $variants[$name] = [
                'path' => '/' . ltrim($variantPath, '/'),
                'width' => (int) $variant->getImageWidth(),
                'height' => (int) $variant->getImageHeight(),
                'max' => $maxSize,
            ];

            $variant->clear();
            $variant->destroy();
        }

        $image->clear();
        $image->destroy();

        $meta = is_array($this->meta) ? $this->meta : [];
        $imageMeta = is_array($meta['image'] ?? null) ? $meta['image'] : [];
        $imageMeta['variants'] = $variants;
        $meta['image'] = $imageMeta;
        $this->meta = $meta;
        $this->saveQuietly();
    }

    protected function resolvePixelAspectRatio(string $aspect, int $sourceWidth, int $sourceHeight): ?float
    {
        if (!$aspect || $aspect === 'free') {
            return null;
        }
        if ($aspect === 'original') {
            return $sourceHeight > 0 ? ($sourceWidth / $sourceHeight) : null;
        }
        if (!preg_match('/^(\d+):(\d+)$/', $aspect, $matches)) {
            return null;
        }
        $w = (int) $matches[1];
        $h = (int) $matches[2];
        if ($w <= 0 || $h <= 0) {
            return null;
        }
        return $w / $h;
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
