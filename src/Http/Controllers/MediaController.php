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

class MediaController extends Controller
{

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

            $defaults = [
                'name' => $file->getClientOriginalName(),
                'description' => $file->getClientOriginalName(),
                'tags' => $key,
                'storage' => $storage,
                'filename' => $filenamePrefix . '/' . date('Y/m') . '/' . basename($file->getFilename()) . '.' . $file->getClientOriginalExtension(),
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
        $diskKey = $request->input('disk', 'public');

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

        // Zusammensetzen
        $filename = date('Y/m') . '/' . $uuid . '_' . basename($originalName);
        $disk = config("filesystems.disks.{$diskKey}") ? $diskKey : 'public';
        $targetPath = Storage::disk($disk)->path($filename);
        $targetDir = dirname($targetPath);
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $output = fopen($targetPath, 'ab');
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunk = "{$tempDir}/chunk_{$i}";
            $in = fopen($chunk, 'rb');
            stream_copy_to_stream($in, $output);
            fclose($in);
            unlink($chunk);
        }
        fclose($output);
        rmdir($tempDir);

        // Media anlegen
        $media = new Media([
            'name' => $originalName,
            'description' => $originalName,
            'tags' => 'chunked',
            'storage' => $disk,
            'filename' => '/' . $filename,
            'private' => true,
        ]);
        $media->save();
        $media->setContent(file_get_contents($targetPath));
        $media->save();

        return response()->json(['done' => true, 'media' => $media]);
    }

}
