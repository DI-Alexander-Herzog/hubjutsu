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
            $filenamePrefix = "";
            $storage = $key;
            if (!isset($disks[$key])) {
                $filenamePrefix = '/' . $key;
                $storage = 'public';
            }

            $attributes = $request->get('attributes', []);
            /** @var UploadedFile $file */
            $media = new Media(array_merge($attributes, [
                'name' => $file->getClientOriginalName(),
                'description' => $file->getClientOriginalName(),
                'tags' => $key,
                'storage' => $storage,
                'filename' => $filenamePrefix . '/' . date('Y/m') . '/' . basename($file->getFilename()) . '.' . $file->getClientOriginalExtension(),
                'private' => true,
            ]));
            $media->save();
            $media->setContent($file->getContent());
            $media->save();

            $uploads[$key] = $media;
        }
        return $uploads;
    }

}
