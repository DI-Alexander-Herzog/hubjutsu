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

class MediaController extends Controller
{
    protected function canEditMedia(Media $media): bool
    {
        if (!$media->user_id) {
            return true;
        }

        return (int) $media->user_id === (int) Auth::id();
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
        ]);

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
        ]);
        $media->save();

        return redirect()->route('media.edit', [$media->id]);
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

        return response()->json(['done' => true, 'media' => $media]);
    }

}
