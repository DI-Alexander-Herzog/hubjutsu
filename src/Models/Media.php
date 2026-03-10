<?php


namespace AHerzog\Hubjutsu\Models;

use App\Jobs\GeneratePdfThumbnail;
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
use Symfony\Component\Process\Process;

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
            $media->dispatchPdfThumbnailGenerationIfNeeded();
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
        return $this->thumb();
    }

    public function url(): ?string
    {
        if (!$this->storage || !$this->filename) {
            return null;
        }

        return $this->getUrl();
    }

    public function thumb(): ?string
    {
        return $this->variantPreviewUrl('thumb')
            ?: $this->med();
    }

    public function med(): ?string
    {
        return $this->variantPreviewUrl('med')
            ?: $this->big();
    }

    public function big(): ?string
    {
        return $this->variantPreviewUrl('big')
            ?: $this->originalPreviewUrl();
    }

    protected function originalPreviewUrl(): ?string
    {
        if (!is_string($this->mimetype) || !str_starts_with(strtolower($this->mimetype), 'image/')) {
            return null;
        }

        return $this->url();
    }

    protected function variantPreviewUrl(string $variant): ?string
    {
        if (!$this->storage) {
            return null;
        }

        $variantPath = data_get($this->meta, 'image.variants.' . $variant . '.path');
        if (!is_string($variantPath) || $variantPath === '') {
            return null;
        }

        $normalizedPath = ltrim($variantPath, '/');
        if (!Storage::disk($this->storage)->exists($normalizedPath)) {
            return null;
        }

        if ($this->private && \Illuminate\Support\Facades\Route::has('media.variant')) {
            return route('media.variant', [$this->getKey(), $variant]);
        }

        return $this->appendCacheBuster(Storage::disk($this->storage)->url($normalizedPath));
    }

    public function getUrl() {
        if ($this->private && \Illuminate\Support\Facades\Route::has('media.file')) {
            return route('media.file', [$this->getKey()]);
        }
        $url = Storage::disk($this->storage)->url(ltrim((string) $this->filename, '/'));
        return $this->appendCacheBuster($url);
    }

    protected function appendCacheBuster(string $url): string
    {
        $token = $this->updated_at?->getTimestamp();
        if (!$token) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';
        return $url . $separator . 't=' . $token;
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
        $currentStorage = (string) $this->storage;
        $file = (string) $this->filename;
        $category = $this->category;
        if (!$currentStorage || !$file) {
            return;
        }

        $disks = config("filesystems.disks");
        $filenamePrefix = "";
        if ($category && isset($disks[$category])) {
            $storage = $category;
        } else {
            if ($category) {
                $filenamePrefix = '/' . $category;
            }
            $storage = $this->private ? 'local' : 'public';
        }

        $originalStorage = (string) ($this->getOriginal('storage') ?? '');
        $originalFilename = (string) ($this->getOriginal('filename') ?? '');
        $sourceStorage = $originalStorage !== '' ? $originalStorage : $currentStorage;
        $sourceFile = ltrim($originalFilename !== '' ? $originalFilename : $file, '/');
        $normalizedCurrentFile = ltrim($file, '/');

        if ($sourceStorage !== $storage || ($category && !str_starts_with($file, $filenamePrefix . '/'))) {
            if (!Storage::disk($sourceStorage)->exists($sourceFile)) {
                // Nothing to move if source file already exists at target location.
                if (Storage::disk($storage)->exists($normalizedCurrentFile)) {
                    return;
                }
                return;
            }

            // Keep each media file in its own scoped folder to avoid filename collisions on relocate.
            $newFilename = $filenamePrefix
                . '/'
                . $this->created_at->format('Y/m')
                . '/'
                . $this->getKey()
                . '/'
                . basename($sourceFile);
            $newFilename = '/' . ltrim($newFilename, '/');
            $targetFile = ltrim($newFilename, '/');

            $this->moveFileBetweenDisks($sourceStorage, $sourceFile, $storage, $targetFile);
            $this->relocateDerivedAssets($sourceStorage, $sourceFile, $storage, $targetFile);

            $this->storage = $storage;
            $this->filename = $newFilename;
            $this->saveQuietly();
        }

    }

    protected function relocateDerivedAssets(
        string $sourceDisk,
        string $sourceMainFile,
        string $targetDisk,
        string $targetMainFile
    ): void {
        $meta = is_array($this->meta) ? $this->meta : [];
        $sourceBaseDir = trim((string) dirname($sourceMainFile), '/');
        $targetBaseDir = trim((string) dirname($targetMainFile), '/');
        if ($sourceBaseDir === '' || $targetBaseDir === '') {
            return;
        }

        $variants = (array) data_get($meta, 'image.variants', []);
        foreach ($variants as $key => $variant) {
            $path = is_array($variant) ? ($variant['path'] ?? null) : null;
            if (!is_string($path) || $path === '') {
                continue;
            }

            $movedPath = $this->relocatePathByBaseDir($sourceDisk, $targetDisk, $path, $sourceBaseDir, $targetBaseDir);
            if ($movedPath !== null && is_array($variant)) {
                $variant['path'] = $movedPath;
                $variants[$key] = $variant;
            }
        }
        data_set($meta, 'image.variants', $variants);

        $hlsPlaylist = data_get($meta, 'video.hls.playlist');
        if (is_string($hlsPlaylist) && $hlsPlaylist !== '') {
            $sourcePlaylist = ltrim($hlsPlaylist, '/');
            $sourceHlsDir = trim((string) dirname($sourcePlaylist), '/');
            if ($sourceHlsDir !== '' && ($sourceHlsDir === $sourceBaseDir || str_starts_with($sourceHlsDir, $sourceBaseDir . '/'))) {
                $relativeHlsDir = ltrim(substr($sourceHlsDir, strlen($sourceBaseDir)), '/');
                $targetHlsDir = trim($targetBaseDir . '/' . $relativeHlsDir, '/');
                $this->moveDirectoryBetweenDisks($sourceDisk, $sourceHlsDir, $targetDisk, $targetHlsDir);

                $playlistBasename = basename($sourcePlaylist);
                data_set($meta, 'video.hls.playlist', '/' . trim($targetHlsDir . '/' . $playlistBasename, '/'));
            }
        }

        $this->meta = $meta;
    }

    protected function relocatePathByBaseDir(
        string $sourceDisk,
        string $targetDisk,
        string $path,
        string $sourceBaseDir,
        string $targetBaseDir
    ): ?string {
        $sourcePath = ltrim($path, '/');
        if (!($sourcePath === $sourceBaseDir || str_starts_with($sourcePath, $sourceBaseDir . '/'))) {
            return null;
        }

        $relativePath = ltrim(substr($sourcePath, strlen($sourceBaseDir)), '/');
        $targetPath = trim($targetBaseDir . '/' . $relativePath, '/');
        $this->moveFileBetweenDisks($sourceDisk, $sourcePath, $targetDisk, $targetPath);

        return '/' . $targetPath;
    }

    protected function moveFileBetweenDisks(string $sourceDisk, string $sourcePath, string $targetDisk, string $targetPath): void
    {
        $sourcePath = ltrim($sourcePath, '/');
        $targetPath = ltrim($targetPath, '/');
        if ($sourcePath === '' || $targetPath === '') {
            return;
        }
        if (!Storage::disk($sourceDisk)->exists($sourcePath)) {
            return;
        }

        Storage::disk($targetDisk)->makeDirectory(trim((string) dirname($targetPath), '/'));
        if ($sourceDisk === $targetDisk) {
            if ($sourcePath !== $targetPath) {
                Storage::disk($sourceDisk)->move($sourcePath, $targetPath);
            }
            return;
        }

        Storage::disk($targetDisk)->put($targetPath, Storage::disk($sourceDisk)->get($sourcePath));
        Storage::disk($sourceDisk)->delete($sourcePath);
    }

    protected function moveDirectoryBetweenDisks(string $sourceDisk, string $sourceDir, string $targetDisk, string $targetDir): void
    {
        $sourceDir = trim($sourceDir, '/');
        $targetDir = trim($targetDir, '/');
        if ($sourceDir === '' || $targetDir === '') {
            return;
        }
        if (!Storage::disk($sourceDisk)->exists($sourceDir)) {
            return;
        }
        if ($sourceDisk === $targetDisk && $sourceDir === $targetDir) {
            return;
        }

        $files = Storage::disk($sourceDisk)->allFiles($sourceDir);
        foreach ($files as $file) {
            $relative = ltrim(substr($file, strlen($sourceDir)), '/');
            $targetFile = trim($targetDir . '/' . $relative, '/');
            $this->moveFileBetweenDisks($sourceDisk, $file, $targetDisk, $targetFile);
        }

        Storage::disk($sourceDisk)->deleteDirectory($sourceDir);
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

    protected function dispatchPdfThumbnailGenerationIfNeeded(): void
    {
        if (!$this->wasRecentlyCreated && !$this->wasChanged(['filename', 'storage', 'mimetype', 'meta'])) {
            return;
        }

        $this->queuePdfThumbnailGeneration(false);
    }

    public function needsPdfThumbnailGeneration(): bool
    {
        if (!is_string($this->mimetype) || strtolower($this->mimetype) !== 'application/pdf') {
            return false;
        }
        if (!class_exists(Imagick::class)) {
            return false;
        }
        if (!$this->storage || !$this->filename) {
            return false;
        }

        $sourcePath = ltrim((string) $this->filename, '/');
        if (!Storage::disk($this->storage)->exists($sourcePath)) {
            return false;
        }

        $thumbPath = data_get($this->meta, 'image.variants.thumb.path');
        if (is_string($thumbPath) && $thumbPath !== '' && Storage::disk($this->storage)->exists(ltrim($thumbPath, '/'))) {
            return false;
        }

        $status = (string) data_get($this->meta, 'pdf.thumbnail.status', '');
        if (in_array($status, ['queued', 'processing'], true)) {
            return false;
        }

        return true;
    }

    public function queuePdfThumbnailGeneration(bool $force = false): bool
    {
        if (!is_string($this->mimetype) || strtolower($this->mimetype) !== 'application/pdf') {
            return false;
        }
        if (!class_exists(Imagick::class)) {
            return false;
        }
        if (!$this->storage || !$this->filename) {
            return false;
        }

        $sourcePath = ltrim((string) $this->filename, '/');
        if (!Storage::disk($this->storage)->exists($sourcePath)) {
            return false;
        }

        if (!$force && !$this->needsPdfThumbnailGeneration()) {
            return false;
        }

        $meta = is_array($this->meta) ? $this->meta : [];
        data_set($meta, 'pdf.thumbnail.status', 'queued');
        data_set($meta, 'pdf.thumbnail.queued_at', now()->toIso8601String());
        data_set($meta, 'pdf.thumbnail.error', null);
        $this->meta = $meta;
        $this->saveQuietly();

        $mediaId = (int) $this->getKey();
        try {
            GeneratePdfThumbnail::dispatch($mediaId);            
        } catch (\Throwable $e) {
            $failedMeta = is_array($this->meta) ? $this->meta : [];
            data_set($failedMeta, 'pdf.thumbnail.status', 'failed');
            data_set($failedMeta, 'pdf.thumbnail.failed_at', now()->toIso8601String());
            data_set($failedMeta, 'pdf.thumbnail.error', (string) $e->getMessage());
            $this->meta = $failedMeta;
            $this->saveQuietly();
            report($e);
            return false;
        }

        return true;
    }

    public function generatePdfThumbnailVariant(int $maxSize = 300): void
    {
        if (!is_string($this->mimetype) || strtolower($this->mimetype) !== 'application/pdf') {
            return;
        }
        if (!class_exists(Imagick::class)) {
            return;
        }
        if (!$this->storage || !$this->filename) {
            return;
        }

        $sourcePath = ltrim((string) $this->filename, '/');
        if (!Storage::disk($this->storage)->exists($sourcePath)) {
            return;
        }

        $absoluteSourcePath = Storage::disk($this->storage)->path($sourcePath);

        $pdf = new Imagick();
        // Render at a size that allows generating big/med/thumb variants with good quality.
        $pdf->setResolution(200, 200);
        $pdf->readImage($absoluteSourcePath . '[0]');
        $pdf->setImageBackgroundColor('white');
        $flattened = $pdf->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        $flattened->setImageFormat('webp');
        $flattened->setImageCompressionQuality(85);

        $srcW = (int) $flattened->getImageWidth();
        $srcH = (int) $flattened->getImageHeight();
        if ($srcW <= 0 || $srcH <= 0) {
            $flattened->clear();
            $flattened->destroy();
            $pdf->clear();
            $pdf->destroy();
            return;
        }

        $baseName = pathinfo($sourcePath, PATHINFO_FILENAME);
        $directory = trim((string) dirname($sourcePath), '/');
        $variantDir = ($directory ? $directory . '/' : '') . 'variants';
        Storage::disk($this->storage)->makeDirectory($variantDir);

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

        $sizes = [
            'big' => 1600,
            'med' => 900,
            'thumb' => $maxSize,
        ];
        $variants = [];
        foreach ($sizes as $name => $targetMax) {
            $variant = clone $flattened;
            $vW = (int) $variant->getImageWidth();
            $vH = (int) $variant->getImageHeight();
            if ($vW <= 0 || $vH <= 0) {
                $variant->clear();
                $variant->destroy();
                continue;
            }

            if ($vW >= $vH) {
                $targetW = $targetMax;
                $targetH = (int) max(1, round(($vH / $vW) * $targetMax));
            } else {
                $targetH = $targetMax;
                $targetW = (int) max(1, round(($vW / $vH) * $targetMax));
            }
            $variant->resizeImage($targetW, $targetH, Imagick::FILTER_LANCZOS, 1, true);

            $variantPath = $variantDir . '/' . $baseName . '-pdf-' . $name . '.webp';
            $variant->writeImage(Storage::disk($this->storage)->path($variantPath));
            $variants[$name] = [
                'path' => '/' . ltrim($variantPath, '/'),
                'width' => (int) $variant->getImageWidth(),
                'height' => (int) $variant->getImageHeight(),
                'max' => $targetMax,
                'mimetype' => 'image/webp',
                'source' => 'pdf',
            ];

            $variant->clear();
            $variant->destroy();
        }

        $meta = is_array($this->meta) ? $this->meta : [];
        $imageMeta = is_array($meta['image'] ?? null) ? $meta['image'] : [];
        $imageMeta['variants'] = $variants;
        $meta['image'] = $imageMeta;
        data_set($meta, 'pdf.thumbnail.status', 'done');
        data_set($meta, 'pdf.thumbnail.done_at', now()->toIso8601String());
        $this->meta = $meta;
        $this->saveQuietly();

        $flattened->clear();
        $flattened->destroy();
        $pdf->clear();
        $pdf->destroy();
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

    public function generateHlsFromVideo(): void
    {
        if (!$this->storage || !$this->filename) {
            throw new \RuntimeException('Video-Datei ist nicht verfügbar.');
        }

        $sourceFile = ltrim((string) $this->filename, '/');
        if (!Storage::disk($this->storage)->exists($sourceFile)) {
            throw new \RuntimeException('Video-Datei wurde nicht gefunden.');
        }

        $baseName = pathinfo($sourceFile, PATHINFO_FILENAME);
        $directory = trim((string) dirname($sourceFile), '/');
        $hlsDirectory = ($directory ? $directory . '/' : '') . 'hls/' . $baseName;
        $playlistRelativePath = $hlsDirectory . '/index.m3u8';
        $segmentPatternRelativePath = $hlsDirectory . '/segment_%05d.ts';

        Storage::disk($this->storage)->deleteDirectory($hlsDirectory);
        Storage::disk($this->storage)->makeDirectory($hlsDirectory);

        $meta = is_array($this->meta) ? $this->meta : [];
        $videoMeta = is_array($meta['video'] ?? null) ? $meta['video'] : [];
        $segmentMeta = is_array($videoMeta['segment'] ?? null) ? $videoMeta['segment'] : [];
        $segmentsMeta = $this->normalizeVideoSegments((array) ($videoMeta['segments'] ?? []));

        $segmentFrom = isset($segmentMeta['from']) ? (float) $segmentMeta['from'] : null;
        $segmentTo = isset($segmentMeta['to']) ? (float) $segmentMeta['to'] : null;
        if ($segmentFrom !== null && $segmentFrom < 0) {
            $segmentFrom = 0.0;
        }
        if ($segmentTo !== null && $segmentTo < 0) {
            $segmentTo = 0.0;
        }
        if (count($segmentsMeta) === 0 && ($segmentFrom !== null || $segmentTo !== null)) {
            $segmentsMeta = [[
                'from' => $segmentFrom ?? 0.0,
                'to' => $segmentTo ?? null,
            ]];
        }
        $segmentsSpec = collect($segmentsMeta)
            ->filter(function (array $segment): bool {
                return isset($segment['to']) && (float) $segment['to'] > (float) ($segment['from'] ?? 0);
            })
            ->map(function (array $segment): string {
                return ((float) $segment['from']) . '-' . ((float) $segment['to']);
            })
            ->implode(',');

        $scriptPath = (string) config('hubjutsu.media_hls_script');
        if ($scriptPath === '') {
            $scriptPath = dirname(__DIR__, 2) . '/scripts/generate-hls.sh';
        } elseif (!str_starts_with($scriptPath, '/')) {
            $scriptPath = base_path($scriptPath);
        }
        if (!is_file($scriptPath)) {
            throw new \RuntimeException("HLS-Skript nicht gefunden: {$scriptPath}");
        }

        $process = new Process([
            $scriptPath,
            Storage::disk($this->storage)->path($sourceFile),
            Storage::disk($this->storage)->path($playlistRelativePath),
            Storage::disk($this->storage)->path($segmentPatternRelativePath),
            $segmentFrom !== null && $segmentFrom > 0 ? (string) $segmentFrom : '',
            $segmentTo !== null && $segmentTo > 0 ? (string) $segmentTo : '',
            $segmentsSpec,
        ]);
        $process->setTimeout(3600);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new \RuntimeException(trim($process->getErrorOutput()) ?: 'HLS-Generierung fehlgeschlagen.');
        }

        if (!Storage::disk($this->storage)->exists($playlistRelativePath)) {
            throw new \RuntimeException('HLS-Playlist wurde nicht erzeugt.');
        }

        $videoMeta['hls'] = [
            'playlist' => '/' . ltrim($playlistRelativePath, '/'),
            'generated_at' => now()->toIso8601String(),
        ];
        if (count($segmentsMeta) > 0) {
            $videoMeta['segments'] = $segmentsMeta;
            $videoMeta['segment'] = [
                'from' => (float) ($segmentsMeta[0]['from'] ?? 0),
                'to' => (float) ($segmentsMeta[count($segmentsMeta) - 1]['to'] ?? 0),
            ];
        }
        $meta['video'] = $videoMeta;
        $this->meta = $meta;
        $this->saveQuietly();
    }

    public function generateAudioMp3FromVideo(): string
    {
        if (!$this->storage || !$this->filename) {
            throw new \RuntimeException('Video-Datei ist nicht verfügbar.');
        }
        if (!is_string($this->mimetype) || !str_starts_with($this->mimetype, 'video/')) {
            throw new \RuntimeException('MP3 kann nur aus Video-Dateien erzeugt werden.');
        }

        $sourceRelativePath = ltrim((string) $this->filename, '/');
        if (!Storage::disk($this->storage)->exists($sourceRelativePath)) {
            throw new \RuntimeException('Video-Datei wurde nicht gefunden.');
        }

        $baseName = pathinfo($sourceRelativePath, PATHINFO_FILENAME);
        $directory = trim((string) dirname($sourceRelativePath), '/');
        $audioDirectory = ($directory ? $directory . '/' : '') . 'audio';
        $audioRelativePath = $audioDirectory . '/' . $baseName . '.mp3';

        Storage::disk($this->storage)->makeDirectory($audioDirectory);

        $meta = is_array($this->meta) ? $this->meta : [];
        $videoMeta = is_array($meta['video'] ?? null) ? $meta['video'] : [];
        $segments = $this->normalizeVideoSegments((array) ($videoMeta['segments'] ?? []));
        if (count($segments) === 0) {
            $legacy = is_array($videoMeta['segment'] ?? null) ? $videoMeta['segment'] : [];
            $from = isset($legacy['from']) ? (float) $legacy['from'] : null;
            $to = isset($legacy['to']) ? (float) $legacy['to'] : null;
            if ($from !== null && $to !== null && $to > $from) {
                $segments = [['from' => $from, 'to' => $to]];
            }
        }

        $sourceAbsolutePath = Storage::disk($this->storage)->path($sourceRelativePath);
        $audioAbsolutePath = Storage::disk($this->storage)->path($audioRelativePath);
        $command = ['ffmpeg', '-y'];

        if (count($segments) > 0) {
            foreach ($segments as $segment) {
                $command[] = '-ss';
                $command[] = (string) $segment['from'];
                $command[] = '-to';
                $command[] = (string) $segment['to'];
                $command[] = '-i';
                $command[] = $sourceAbsolutePath;
            }

            $streamRefs = [];
            for ($index = 0; $index < count($segments); $index++) {
                $streamRefs[] = "[{$index}:a]";
            }
            $command[] = '-filter_complex';
            $command[] = implode('', $streamRefs) . 'concat=n=' . count($segments) . ':v=0:a=1[aout]';
            $command[] = '-map';
            $command[] = '[aout]';
        } else {
            $command[] = '-i';
            $command[] = $sourceAbsolutePath;
            $command[] = '-vn';
        }

        $command[] = '-ac';
        $command[] = '1';
        $command[] = '-ar';
        $command[] = '44100';
        $command[] = '-b:a';
        $command[] = '192k';
        $command[] = $audioAbsolutePath;

        $process = new Process($command);
        $process->setTimeout(3600);
        $process->run();

        if (!$process->isSuccessful()) {
            $stderr = trim($process->getErrorOutput());
            if ($stderr !== '') {
                throw new \RuntimeException('MP3-Generierung fehlgeschlagen: ' . Str::limit($stderr, 1200));
            }
            throw new \RuntimeException('MP3-Generierung fehlgeschlagen.');
        }
        if (!Storage::disk($this->storage)->exists($audioRelativePath)) {
            throw new \RuntimeException('MP3-Datei wurde nicht erzeugt.');
        }

        $videoMeta['audio'] = [
            'mp3' => '/' . ltrim($audioRelativePath, '/'),
            'generated_at' => now()->toIso8601String(),
        ];
        $meta['video'] = $videoMeta;
        $this->meta = $meta;
        $this->saveQuietly();

        return $audioRelativePath;
    }

    protected function normalizeVideoSegments(array $segments): array
    {
        $normalized = [];
        foreach ($segments as $segment) {
            if (!is_array($segment)) {
                continue;
            }
            $from = isset($segment['from']) ? (float) $segment['from'] : null;
            $to = isset($segment['to']) ? (float) $segment['to'] : null;
            if ($from === null || $to === null) {
                continue;
            }
            $from = max(0.0, $from);
            $to = max(0.0, $to);
            if ($to <= $from) {
                continue;
            }
            $normalized[] = ['from' => $from, 'to' => $to];
        }

        usort($normalized, fn (array $a, array $b) => $a['from'] <=> $b['from']);
        $merged = [];
        foreach ($normalized as $segment) {
            $lastIndex = count($merged) - 1;
            if ($lastIndex < 0) {
                $merged[] = $segment;
                continue;
            }
            $last = $merged[$lastIndex];
            if ($segment['from'] <= $last['to']) {
                $merged[$lastIndex]['to'] = max($last['to'], $segment['to']);
                continue;
            }
            $merged[] = $segment;
        }

        return $merged;
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
