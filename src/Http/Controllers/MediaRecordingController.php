<?php
namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Jobs\ProcessRecording;
use App\Models\MediaRecording;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
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
        if ($request->has('index')) {
            return response()->json([
                'message' => 'Legacy field "index" is no longer supported. Use segment_index + part_index.',
            ], 422);
        }

        $request->validate([
            'segment_index' => ['required','integer','min:0'],
            'part_index' => ['required','integer','min:0'],
            'is_last_part' => ['nullable', 'boolean'],
            'total_parts' => ['nullable', 'integer', 'min:1'],
            'chunk' => ['required','file','max:51200'], // 50MB
        ]);

        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);
        $this->requireTokenOrFail($request, $rec);

        if (!in_array($rec->status, ['recording','finished'], true)) {
            abort(409, 'Recording not accepting chunks.');
        }

        $segmentIndex = (int)$request->input('segment_index');
        $partIndex = (int)$request->input('part_index');
        $isLastPart = filter_var(
            $request->input('is_last_part', false),
            FILTER_VALIDATE_BOOLEAN
        );
        $totalParts = $request->has('total_parts') ? (int)$request->input('total_parts') : null;

        $disk = Storage::disk('recordings_private');
        $segmentPadded = sprintf('%06d', $segmentIndex);
        $partPadded = sprintf('%06d', $partIndex);
        $partDir = "recordings/{$uuid}/parts/seg_{$segmentPadded}";
        $partName = "part_{$partPadded}.bin";

        $stored = $disk->putFileAs($partDir, $request->file('chunk'), $partName);
        if ($stored === false) {
            Log::error('recording part upload failed', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'part_index' => $partIndex,
                'total_parts' => $totalParts,
            ]);
            abort(500, 'Failed to store upload part.');
        }

        $assembled = false;
        if ($isLastPart) {
            if ($totalParts === null || $totalParts < 1) {
                return response()->json([
                    'message' => 'total_parts is required when is_last_part=true',
                ], 422);
            }

            $assembled = $this->assembleSegmentOrFail(
                $disk,
                $uuid,
                $segmentIndex,
                $totalParts
            );

            if ($assembled) {
                $rec->last_chunk_index = max((int)$rec->last_chunk_index, $segmentIndex + 1);
                $rec->save();
            }
        }

        return response()->json(['ok' => true, 'assembled' => $assembled]);
    }

    private function assembleSegmentOrFail($disk, string $uuid, int $segmentIndex, int $totalParts): bool
    {
        $segmentPadded = sprintf('%06d', $segmentIndex);
        $partsDirRel = "recordings/{$uuid}/parts/seg_{$segmentPadded}";
        $chunkDirRel = "recordings/{$uuid}/chunks";
        $chunkFinalRel = "{$chunkDirRel}/chunk_{$segmentPadded}.webm";
        $chunkTempRel = "{$chunkFinalRel}.part";

        $partsDir = $disk->path($partsDirRel);
        $chunkDir = $disk->path($chunkDirRel);
        if (!is_dir($chunkDir) && !@mkdir($chunkDir, 0775, true) && !is_dir($chunkDir)) {
            Log::error('recording chunk assembly: cannot create chunks dir', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'total_parts' => $totalParts,
            ]);
            abort(500, 'Failed to create chunks directory.');
        }

        $chunkFinalPath = $disk->path($chunkFinalRel);
        if (file_exists($chunkFinalPath)) {
            return true;
        }

        $chunkTempPath = $disk->path($chunkTempRel);
        $out = @fopen($chunkTempPath, 'wb');
        if ($out === false) {
            Log::error('recording chunk assembly: cannot open temp file', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'total_parts' => $totalParts,
                'temp_path' => $chunkTempPath,
            ]);
            abort(500, 'Cannot create segment temp file.');
        }

        try {
            for ($i = 0; $i < $totalParts; $i++) {
                $partPath = sprintf('%s/part_%06d.bin', $partsDir, $i);
                if (!file_exists($partPath) || !is_readable($partPath)) {
                    throw new \RuntimeException("Missing part {$i}");
                }

                $in = @fopen($partPath, 'rb');
                if ($in === false) {
                    throw new \RuntimeException("Cannot read part {$i}");
                }

                stream_copy_to_stream($in, $out);
                fclose($in);
            }
        } catch (\RuntimeException $e) {
            fclose($out);
            @unlink($chunkTempPath);
            Log::warning('recording chunk assembly failed', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'total_parts' => $totalParts,
                'error' => $e->getMessage(),
            ]);
            abort(409, $e->getMessage());
        } catch (\Throwable $e) {
            fclose($out);
            @unlink($chunkTempPath);
            Log::error('recording chunk assembly I/O error', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'total_parts' => $totalParts,
                'error' => $e->getMessage(),
            ]);
            abort(500, 'Segment assembly failed.');
        }

        fclose($out);

        if (!@rename($chunkTempPath, $chunkFinalPath)) {
            @unlink($chunkTempPath);
            Log::error('recording chunk assembly rename failed', [
                'uuid' => $uuid,
                'segment_index' => $segmentIndex,
                'total_parts' => $totalParts,
                'temp_path' => $chunkTempPath,
                'final_path' => $chunkFinalPath,
            ]);
            abort(500, 'Failed to finalize assembled segment.');
        }

        $disk->deleteDirectory($partsDirRel);
        return true;
    }

    public function finish(Request $request, string $uuid)
    {
        $request->validate([
            'last_index' => ['required','integer','min:0'],
            'transcript_lang' => ['nullable', 'string', 'max:32'],
            'transcript_interval_seconds' => ['nullable', 'integer', 'min:1', 'max:60'],
            'transcript_entries' => ['nullable', 'array'],
            'transcript_entries.*.seconds' => ['required_with:transcript_entries', 'numeric', 'min:0'],
            'transcript_entries.*.text' => ['required_with:transcript_entries', 'string', 'max:2000'],
        ]);

        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);
        $this->requireTokenOrFail($request, $rec);

        if (!in_array($rec->status, ['recording','finished'], true)) {
            abort(409, 'Recording cannot be finished.');
        }

        $lastIndex = (int)$request->input('last_index');
        $nextExpectedIndex = max((int) $rec->last_chunk_index, $lastIndex + 1);

        $rec->update([
            'status' => 'finished',
            'last_chunk_index' => $nextExpectedIndex,
        ]);

        $entries = $request->input('transcript_entries', []);
        if (is_array($entries) && count($entries) > 0) {
            $this->storeTranscriptFiles(
                $uuid,
                (string) $request->input('transcript_lang', ''),
                $request->has('transcript_interval_seconds')
                    ? (int) $request->input('transcript_interval_seconds')
                    : null,
                $entries
            );
        }

        // Job wird gespeichert (DB queue), aber läuft nur wenn du queue:work startest
        ProcessRecording::dispatch($uuid);

        return response()->json(['ok' => true, 'status' => 'queued']);
    }

    private function storeTranscriptFiles(string $uuid, string $lang, ?int $intervalSeconds, array $entries): void
    {
        $disk = Storage::disk('recordings_private');
        $baseDir = "recordings/{$uuid}";

        $payload = [
            'uuid' => $uuid,
            'lang' => $lang,
            'interval_seconds' => $intervalSeconds,
            'saved_at' => now()->toIso8601String(),
            'entries' => array_values($entries),
        ];

        $disk->put(
            "{$baseDir}/transcript.json",
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        );

        $lines = [];
        foreach ($entries as $entry) {
            $seconds = (int) floor((float) ($entry['seconds'] ?? 0));
            $text = (string) ($entry['text'] ?? '');
            $lines[] = '['.$this->formatSeconds($seconds).'] '.$text;
        }

        $disk->put("{$baseDir}/transcript.txt", implode(PHP_EOL, $lines).PHP_EOL);
    }

    private function formatSeconds(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $mm = str_pad((string) floor($seconds / 60), 2, '0', STR_PAD_LEFT);
        $ss = str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT);
        return "{$mm}:{$ss}";
    }

    public function status(Request $request, string $uuid)
    {
        $rec = $this->loadOwnedRecordingOrFail($request, $uuid);

        return response()->json([
            'status' => $rec->status,
            'mp4_url' => $rec->status === 'done'
                ? URL::temporarySignedRoute(
                    'mediarecording.download.signed',
                    now()->addHours(24),
                    ['uuid' => $uuid]
                )
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

    public function downloadSigned(Request $request, string $uuid)
    {
        $rec = MediaRecording::where('uuid', $uuid)->firstOrFail();

        if ($rec->status !== 'done' || !$rec->mp4_path) abort(404);

        return Storage::disk('recordings_private')->download(
            $rec->mp4_path,
            "recording_{$uuid}.mp4"
        );
    }
}
