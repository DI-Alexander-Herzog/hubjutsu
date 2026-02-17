<?php
namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Jobs\ProcessRecording;
use App\Models\MediaRecording;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaRecordingController extends Controller
{
    public function init(Request $request)
    {
        $uuid = (string) Str::uuid();
        $token = Str::random(64);

        MediaRecording::create([
            'uuid' => $uuid,
            'user_id' => $request->user()->id,
            'upload_token_hash' => Hash::make($token),
            'status' => 'recording',
            'last_chunk_index' => 0,
        ]);

        return response()->json([
            'uuid' => $uuid,
            'upload_token' => $token,
            'chunk_size_ms' => 1000,
            'max_chunk_mb' => 50,
        ]);
    }

    private function loadOwnedRecordingOrFail(Request $request, string $uuid): MediaRecording
    {
        $rec = MediaRecording::where('uuid', $uuid)->firstOrFail();
        if ((int)$rec->user_id !== (int)$request->user()->id) abort(403, 'Not your recording.');
        return $rec;
    }

    private function requireTokenOrFail(Request $request, MediaRecording $rec): void
    {
        $token = $request->header('X-Upload-Token');
        if (!$token || !Hash::check($token, $rec->upload_token_hash)) {
            abort(403, 'Invalid upload token.');
        }
    }

    public function chunk(Request $request, string $uuid)
    {
        $request->validate([
            'index' => ['required','integer','min:0'],
            'chunk' => ['required','file','max:51200'], // 50MB
        ]);

        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);
        $this->requireTokenOrFail($request, $rec);

        if (!in_array($rec->status, ['recording','finished'], true)) {
            abort(409, 'Recording not accepting chunks.');
        }

        $idx = (int)$request->input('index');

        // Optional strict ordering: require idx == last_chunk_index
        // if ($idx !== (int)$rec->last_chunk_index) abort(409, 'Out of order chunk.');

        $dir = "recordings/{$uuid}/chunks";
        $name = sprintf("chunk_%06d.webm", $idx);

        Storage::disk('recordings_private')->putFileAs($dir, $request->file('chunk'), $name);

        // store "next expected index"
        $rec->last_chunk_index = max((int)$rec->last_chunk_index, $idx + 1);
        $rec->save();

        return response()->json(['ok' => true]);
    }

    public function finish(Request $request, string $uuid)
    {
        $request->validate([
            'last_index' => ['required','integer','min:0'],
        ]);

        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);
        $this->requireTokenOrFail($request, $rec);

        if (!in_array($rec->status, ['recording','finished'], true)) {
            abort(409, 'Recording cannot be finished.');
        }

        $lastIndex = (int)$request->input('last_index');

        $rec->update([
            'status' => 'finished',
            'last_chunk_index' => $lastIndex + 1,
        ]);

        // Job wird gespeichert (DB queue), aber läuft nur wenn du queue:work startest
        ProcessRecording::dispatch($uuid);

        return response()->json(['ok' => true, 'status' => 'queued']);
    }

    public function status(Request $request, string $uuid)
    {
        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);

        return response()->json([
            'status' => $rec->status,
            'mp4_url' => $rec->status === 'done'
                ? route('recording.download', ['uuid' => $uuid]) // wenn du download nutzt
                : null,
            'error_message' => $rec->status === 'error' ? $rec->error_message : null,
        ]);
    }

    public function download(Request $request, string $uuid)
    {
        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);

        if ($rec->status !== 'done' || !$rec->mp4_path) abort(404);

        return Storage::disk('recordings_private')->download(
            $rec->mp4_path,
            "recording_{$uuid}.mp4"
        );
    }
}
