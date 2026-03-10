<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Storage;
use Str;
use Throwable;

class MediaController extends Controller
{
    protected function canEditMedia(Media $media): bool
    {
        if ($this->canAccessMediable($media, 'update')) {
            return true;
        }

        if (!$media->created_by) {
            return true;
        }

        return (int) $media->created_by === (int) Auth::id();
    }

    protected function canViewMedia(Media $media): bool
    {
        if (!$media->private) {
            return true;
        }

        if (!Auth::check()) {
            return false;
        }

        if ($this->canAccessMediable($media, 'view') || $this->canAccessMediable($media, 'update')) {
            return true;
        }

        return $this->canEditMedia($media);
    }

    protected function canAccessMediable(Media $media, string $ability): bool
    {
        if (!Auth::check()) {
            return false;
        }

        $media->loadMissing('mediable');
        $mediable = $media->mediable;
        if (!$mediable) {
            return false;
        }

        return Auth::user()?->can($ability, $mediable) === true;
    }

    public function edit(Media $media): Response
    {
        abort_unless($this->canEditMedia($media), 403);

        return Inertia::render('Media/Edit', [
            'media' => $media,
            'isAttached' => (bool) ($media->mediable_id && $media->mediable_type),
        ]);
    }

    public function update(Request $request, Media $media): RedirectResponse
    {
        abort_unless($this->canEditMedia($media), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'tags' => ['nullable'],
            'meta' => ['nullable', 'array'],
            'meta.image' => ['nullable', 'array'],
            'meta.image.focal_point' => ['nullable', 'array'],
            'meta.image.focal_point.x' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.focal_point.y' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.crop' => ['nullable', 'array'],
            'meta.image.crop.x' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.crop.y' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.crop.w' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.crop.h' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'meta.image.crop.unit' => ['nullable', 'in:percent'],
            'meta.image.crop.aspect' => ['nullable', 'in:free,original,1:1,4:3,16:9,3:4,9:16'],
            'meta.video' => ['nullable', 'array'],
            'meta.video.segment' => ['nullable', 'array'],
            'meta.video.segment.from' => ['nullable', 'numeric', 'min:0'],
            'meta.video.segment.to' => ['nullable', 'numeric', 'min:0'],
            'meta.video.segments' => ['nullable', 'array'],
            'meta.video.segments.*.from' => ['nullable', 'numeric', 'min:0'],
            'meta.video.segments.*.to' => ['nullable', 'numeric', 'min:0'],
            'meta.video.subtitles' => ['nullable', 'array'],
            'meta.video.subtitles.*.label' => ['nullable', 'string', 'max:100'],
            'meta.video.subtitles.*.lang' => ['nullable', 'string', 'max:20'],
            'meta.video.subtitles.*.format' => ['nullable', 'string', 'max:20'],
            'meta.video.subtitles.*.src' => ['nullable', 'string', 'max:2000'],
        ]);

        $segmentFrom = data_get($validated, 'meta.video.segment.from');
        $segmentTo = data_get($validated, 'meta.video.segment.to');
        if ($segmentFrom !== null && $segmentTo !== null && (float) $segmentTo < (float) $segmentFrom) {
            return back()
                ->withInput()
                ->withErrors([
                    'meta.video.segment.to' => 'Segment Ende muss größer oder gleich Segment Start sein.',
                ]);
        }
        $segments = data_get($validated, 'meta.video.segments', []);
        if (is_array($segments)) {
            foreach ($segments as $index => $segment) {
                $from = is_array($segment) && array_key_exists('from', $segment) ? $segment['from'] : null;
                $to = is_array($segment) && array_key_exists('to', $segment) ? $segment['to'] : null;
                if ($from !== null && $to !== null && (float) $to < (float) $from) {
                    return back()
                        ->withInput()
                        ->withErrors([
                            "meta.video.segments.{$index}.to" => 'Segment Ende muss größer oder gleich Segment Start sein.',
                        ]);
                }
            }
        }

        $tags = $validated['tags'] ?? null;
        if (is_string($tags)) {
            $tags = collect(preg_split('/[\s,;]+/', $tags))
                ->filter(fn ($tag) => filled($tag))
                ->map(fn ($tag) => trim((string) $tag))
                ->values()
                ->all();
        } elseif ($tags === null) {
            $tags = [];
        }

        $media->fill([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'tags' => $tags,
            'meta' => $validated['meta'] ?? $media->meta ?? [],
        ]);
        $media->save();
        $media->generateImageVariants();

        return redirect()->route('media.edit', [$media->id]);
    }

    public function generateHls(Media $media): RedirectResponse
    {
        abort_unless($this->canEditMedia($media), 403);

        if (!is_string($media->mimetype) || !str_starts_with($media->mimetype, 'video/')) {
            return back()->with('error', 'HLS kann nur für Videos erzeugt werden.');
        }

        try {
            $media->generateHlsFromVideo();
        } catch (Throwable $e) {
            report($e);
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'M3U8 wurde neu erzeugt.');
    }

    public function restartPdfThumbnail(Media $media): RedirectResponse
    {
        abort_unless($this->canEditMedia($media), 403);

        if (!is_string($media->mimetype) || strtolower($media->mimetype) !== 'application/pdf') {
            return back()->with('error', 'PDF Thumbnail Job ist nur für PDF-Dateien verfügbar.');
        }

        $queued = $media->queuePdfThumbnailGeneration(true);
        if (!$queued) {
            return back()->with('error', 'PDF Thumbnail Job konnte nicht gestartet werden.');
        }

        return back()->with('success', 'PDF Thumbnail Job wurde neu gestartet.');
    }

    public function downloadAudioMp3(Media $media)
    {
        abort_unless($this->canViewMedia($media), 403);

        if (!is_string($media->mimetype) || !str_starts_with($media->mimetype, 'video/')) {
            return back()->with('error', 'MP3-Download ist nur für Videos verfügbar.');
        }

        try {
            $audioRelativePath = $media->generateAudioMp3FromVideo();
        } catch (Throwable $e) {
            report($e);
            return back()->with('error', $e->getMessage());
        }

        if (!$media->storage || !Storage::disk($media->storage)->exists($audioRelativePath)) {
            return back()->with('error', 'MP3-Datei konnte nicht gefunden werden.');
        }

        $sourceName = pathinfo((string) $media->filename, PATHINFO_FILENAME);
        $downloadName = ($sourceName !== '' ? $sourceName : ('media-' . $media->id)) . '.mp3';

        return response()->download(
            Storage::disk($media->storage)->path($audioRelativePath),
            $downloadName,
            ['Content-Type' => 'audio/mpeg']
        );
    }

    public function file(Media $media)
    {
        abort_unless($this->canViewMedia($media), 403);
        abort_unless($media->storage && $media->filename, 404);
        $path = ltrim((string) $media->filename, '/');
        $diskName = (string) $media->storage;

        if (!Storage::disk($diskName)->exists($path)) {
            foreach (['public', 'local'] as $candidate) {
                if ($candidate === $diskName) {
                    continue;
                }
                if (!array_key_exists($candidate, (array) config('filesystems.disks', []))) {
                    continue;
                }
                if (!Storage::disk($candidate)->exists($path)) {
                    continue;
                }

                try {
                    Storage::disk($diskName)->makeDirectory(trim((string) dirname($path), '/'));
                    Storage::disk($diskName)->put($path, Storage::disk($candidate)->get($path));
                    Storage::disk($candidate)->delete($path);
                } catch (Throwable $e) {
                    report($e);
                    $diskName = $candidate;
                    $media->storage = $candidate;
                    $media->saveQuietly();
                }
                break;
            }
        }
        abort_unless(Storage::disk($diskName)->exists($path), 404);

        return response()->file(Storage::disk($diskName)->path($path), [
            'Content-Type' => $media->mimetype ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
        ]);
    }

    public function variant(Media $media, string $variant)
    {
        abort_unless($this->canViewMedia($media), 403);
        abort_unless($variant !== '', 404);

        $variantMeta = data_get($media->meta, "image.variants.{$variant}");
        $variantPath = is_array($variantMeta) ? ($variantMeta['path'] ?? null) : null;
        abort_unless(is_string($variantPath) && $variantPath !== '', 404);

        $path = ltrim($variantPath, '/');
        abort_unless($media->storage, 404);
        abort_unless(Storage::disk($media->storage)->exists($path), 404);

        return response()->file(Storage::disk($media->storage)->path($path), [
            'Content-Type' => (mime_content_type(Storage::disk($media->storage)->path($path)) ?: 'application/octet-stream'),
            'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
        ]);
    }

    public function upload(Request $request) {

        $files = $request->allFiles();

        $disks = config("filesystems.disks");

        $uploads = [];
        foreach($files as $key => $file) {
            /** @var UploadedFile $file */

            $attributes = $request->get('attributes', []);
            $fieldAttributes = is_array($attributes) && isset($attributes[$key]) ? $attributes[$key] : $attributes;
            if (!is_array($fieldAttributes)) {
                $fieldAttributes = [];
            }

            $requestedStorage = $fieldAttributes['storage'] ?? $key;
            $filenamePrefix = "";
            $storage = $requestedStorage;
            if (!isset($disks[$requestedStorage])) {
                $filenamePrefix = '/' . $requestedStorage;
                $storage = 'public';
            }

            $uploadUuid = (string) Str::uuid();
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $baseName = pathinfo($originalName, PATHINFO_FILENAME);
            $safeBaseName = Str::slug($baseName) ?: 'file';
            $targetFilename = $safeBaseName . ($extension ? '.' . $extension : '');

            $defaults = [
                'name' => $originalName,
                'description' => $originalName,
                'tags' => $key,
                'storage' => $storage,
                'filename' => $filenamePrefix . '/' . date('Y/m') . '/' . $uploadUuid . '/' . $targetFilename,
                'private' => true,
            ];

            $media = new Media(array_merge($defaults, $fieldAttributes));
            $media->save();
            $media->setContent($file->getContent());
            $media->save();
            $media->refresh();

            $uploads[$key] = $media;
        }
        return $uploads;
    }


    public function chunkedUpload(Request $request) {
        $uuid = $request->input('upload_id'); // UUID pro Datei
        $chunkIndex = $request->input('chunk_index');
        $totalChunks = $request->input('total_chunks');
        $originalName = $request->input('filename');
        $diskKey = $request->input('disk', 'local');

        $file = $request->file('chunk');
        if (!$file instanceof UploadedFile) {
            return response()->json(['error' => 'no chunk'], 400);
        }

        $tempDir = storage_path("app/uploads/tmp/{$uuid}");
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        $chunkPath = "{$tempDir}/chunk_{$chunkIndex}";
        $file->move($tempDir, basename($chunkPath));

        // Prüfung auf vollständigkeit
        $chunks = glob("{$tempDir}/chunk_*");
        if (count($chunks) < $totalChunks) {
            return response()->json(['status' => 'waiting']);
        }

        // Guard against race conditions: only continue when all expected chunk files exist.
        for ($i = 0; $i < $totalChunks; $i++) {
            if (!is_file("{$tempDir}/chunk_{$i}")) {
                return response()->json(['status' => 'waiting']);
            }
        }

        // Zusammensetzen
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        $safeBaseName = Str::slug($baseName) ?: 'upload';
        $targetFilename = $safeBaseName . ($extension ? '.' . $extension : '');
        $filename = date('Y/m') . '/' . $uuid . '/' . $targetFilename;
        $disk = config("filesystems.disks.{$diskKey}") ? $diskKey : 'local';
        $targetPath = Storage::disk($disk)->path($filename);
        $targetDir = dirname($targetPath);
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $output = fopen($targetPath, 'wb');
        if ($output === false) {
            return response()->json(['error' => 'failed to assemble upload'], 500);
        }
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunk = "{$tempDir}/chunk_{$i}";
            $in = fopen($chunk, 'rb');
            if ($in === false) {
                fclose($output);
                return response()->json(['status' => 'waiting']);
            }
            stream_copy_to_stream($in, $output);
            fclose($in);
            unlink($chunk);
        }
        fclose($output);
        rmdir($tempDir);

        if (!Storage::disk($disk)->exists($filename)) {
            return response()->json(['error' => 'assembled file missing'], 500);
        }

        $mimeType = @mime_content_type($targetPath) ?: null;

        // Media anlegen
        $media = new Media([
            'name' => $originalName,
            'description' => $originalName,
            'tags' => 'chunked',
            'storage' => $disk,
            'filename' => '/' . $filename,
            'mimetype' => $mimeType,
            'private' => true,
        ]);
        $media->save();
        $media->refresh();

        return response()->json(['done' => true, 'media' => $media]);
    }

}
