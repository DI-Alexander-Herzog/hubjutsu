<?php


namespace AHerzog\Hubjutsu\Jobs;

use App\Models\MediaRecording;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessStartFailedException;

class ProcessRecording implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800;

    public function __construct(public string $uuid) {}

    public function handle(): void
    {
        $rec = MediaRecording::where('uuid', $this->uuid)->firstOrFail();

        // idempotent guard
        $locked = MediaRecording::where('uuid', $this->uuid)
            ->where('status', 'finished')
            ->update(['status' => 'processing', 'error_message' => null]);

        if ($locked === 0) return;

        $disk = Storage::disk('recordings_private');
        if (!$disk->exists("recordings/{$this->uuid}")) {
            $disk->makeDirectory("recordings/{$this->uuid}/chunks");
        }

        $recordingDir = $disk->path("recordings/{$this->uuid}");
        $chunkDir = $disk->path("recordings/{$this->uuid}/chunks");
        if (!is_dir($recordingDir)) mkdir($recordingDir, 0775, true);

        $listFile = "{$recordingDir}/list.txt";
        $mergedWebm = "{$recordingDir}/merged.webm";
        $stitchedWebm = "{$recordingDir}/stitched_stream.webm";
        $outMp4   = "{$recordingDir}/output.mp4";
        $commandLogFile = "{$recordingDir}/ffmpeg_commands.log";

        $last = max(0, (int)$rec->last_chunk_index - 1);
        $listLines = [];
        $expectedChunkCount = $last + 1;
        $totalChunkBytes = 0;
        $firstChunkBytes = 0;
        $allChunksStartWithEbml = true;

        for ($i = 0; $i <= $last; $i++) {
            $chunk = sprintf("%s/chunk_%06d.webm", $chunkDir, $i);
            if (!file_exists($chunk)) {
                $rec->update(['status'=>'error','error_message'=>"Missing chunk {$i}"]);
                return;
            }

            $size = @filesize($chunk);
            if ($size === false) {
                $rec->update(['status' => 'error', 'error_message' => "Cannot stat chunk {$i}"]);
                return;
            }
            $totalChunkBytes += (int) $size;
            if ($i === 0) {
                $firstChunkBytes = (int) $size;
            }

            $head = @file_get_contents($chunk, false, null, 0, 4);
            $startsWithEbml = ($head !== false && strlen($head) === 4 && bin2hex($head) === '1a45dfa3');
            if (!$startsWithEbml) {
                $allChunksStartWithEbml = false;
            }

            // Concat demuxer format: file '/absolute/path'.
            $escapedChunkPath = str_replace("'", "'\\''", $chunk);
            $listLines[] = "file '{$escapedChunkPath}'";
        }

        if (count($listLines) !== $expectedChunkCount) {
            $rec->update(['status' => 'error', 'error_message' => 'Chunk list is incomplete']);
            return;
        }

        $listContent = implode(PHP_EOL, $listLines) . PHP_EOL;
        if (@file_put_contents($listFile, $listContent) === false) {
            $rec->update([
                'status' => 'error',
                'error_message' => 'Cannot write concat list.txt',
            ]);
            return;
        }

        $appendCommandLog = function (string $content) use ($commandLogFile): void {
            @file_put_contents($commandLogFile, $content, FILE_APPEND);
        };

        $appendCommandLog(
            "=== ProcessRecording {$this->uuid} @ " . now()->toIso8601String() . " ===" . PHP_EOL
        );
        $appendCommandLog("Chunks expected: {$expectedChunkCount}" . PHP_EOL);
        $appendCommandLog("Total chunk bytes: {$totalChunkBytes}" . PHP_EOL);
        $appendCommandLog("First chunk bytes: {$firstChunkBytes}" . PHP_EOL);
        $appendCommandLog("All chunks start with EBML header: " . ($allChunksStartWithEbml ? 'yes' : 'no') . PHP_EOL);
        $appendCommandLog("Concat list file: {$listFile}" . PHP_EOL . PHP_EOL);

        $runFfmpeg = function (array $cmd, string $context) use ($appendCommandLog): array {
            $p = new Process($cmd);
            $p->setTimeout($this->timeout);
            $cmdString = implode(' ', array_map('escapeshellarg', $cmd));
            $appendCommandLog("[{$context}] COMMAND: {$cmdString}" . PHP_EOL);

            try {
                $p->run();
            } catch (ProcessStartFailedException $e) {
                $appendCommandLog("[{$context}] START FAILED: " . $e->getMessage() . PHP_EOL . PHP_EOL);
                Log::error('ffmpeg start failed', [
                    'uuid' => $this->uuid,
                    'context' => $context,
                    'exception' => $e->getMessage(),
                ]);
                return [false, -1, $e->getMessage()];
            }

            $stderr = $p->getErrorOutput();
            $stdout = $p->getOutput();
            $appendCommandLog(
                "[{$context}] EXIT: " . ($p->getExitCode() ?? 'null') . PHP_EOL .
                "[{$context}] STDOUT:" . PHP_EOL . $stdout . PHP_EOL .
                "[{$context}] STDERR:" . PHP_EOL . $stderr . PHP_EOL . PHP_EOL
            );
            Log::info('ffmpeg stderr', [
                'uuid' => $this->uuid,
                'context' => $context,
                'exit_code' => $p->getExitCode(),
                'stderr' => $stderr,
            ]);

            if (!$p->isSuccessful() || $p->getExitCode() !== 0) {
                $shortReason = trim($stderr);
                if ($shortReason === '') {
                    $shortReason = trim($p->getOutput());
                }
                if ($shortReason !== '') {
                    $shortReason = preg_split("/\R/", $shortReason)[0] ?? $shortReason;
                } else {
                    $shortReason = 'unknown ffmpeg error';
                }
                return [false, (int)($p->getExitCode() ?? -1), $shortReason];
            }

            return [true, (int)$p->getExitCode(), ''];
        };

        $stitchChunksToSingleWebm = function () use (
            $chunkDir,
            $last,
            $stitchedWebm,
            $appendCommandLog
        ): array {
            $out = @fopen($stitchedWebm, 'wb');
            if ($out === false) {
                return [false, 'cannot create stitched stream file'];
            }

            try {
                for ($i = 0; $i <= $last; $i++) {
                    $chunk = sprintf("%s/chunk_%06d.webm", $chunkDir, $i);
                    $in = @fopen($chunk, 'rb');
                    if ($in === false) {
                        throw new \RuntimeException("cannot read chunk {$i}");
                    }
                    stream_copy_to_stream($in, $out);
                    fclose($in);
                }
            } catch (\Throwable $e) {
                fclose($out);
                @unlink($stitchedWebm);
                return [false, $e->getMessage()];
            }

            fclose($out);
            $appendCommandLog("[stitch_stream] created {$stitchedWebm}" . PHP_EOL);
            return [true, ''];
        };

        // Independent WebM segments cannot be naively byte-concatenated (duplicate EBML/segment headers/timecodes).
        // Stream-continuation chunks (only first chunk has EBML header) must be stitched by bytes first.
        if (!$allChunksStartWithEbml) {
            $appendCommandLog("[mode] stream-continuation chunks detected; using stitch->transcode path" . PHP_EOL);
            [$stitchedOk, $stitchReason] = $stitchChunksToSingleWebm();
            if (!$stitchedOk) {
                $rec->update([
                    'status' => 'error',
                    'error_message' => "FFmpeg concat failed: {$stitchReason} (exit -1)",
                ]);
                return;
            }

            [$transcodeOk, $transcodeExit, $transcodeReason] = $runFfmpeg([
                'ffmpeg', '-y',
                '-i', $stitchedWebm,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart',
                $outMp4,
            ], 'transcode_from_stitched_stream');

            if (!$transcodeOk) {
                $rec->update([
                    'status' => 'error',
                    'error_message' => "FFmpeg concat failed: {$transcodeReason} (exit {$transcodeExit})",
                ]);
                return;
            }
        } else {
            $appendCommandLog("[mode] independent segment chunks detected; using concat-demuxer path" . PHP_EOL);
            [$mergeOk, $mergeExit, $mergeReason] = $runFfmpeg([
                'ffmpeg', '-y',
                '-f', 'concat', '-safe', '0',
                '-i', $listFile,
                '-c', 'copy',
                $mergedWebm,
            ], 'merge_concat_copy');

            $mergedLooksSuspicious = false;
            if ($mergeOk && $expectedChunkCount > 1 && $firstChunkBytes > 0) {
                $mergedSize = @filesize($mergedWebm);
                if ($mergedSize !== false && (int) $mergedSize <= (int) floor($firstChunkBytes * 1.20)) {
                    $mergedLooksSuspicious = true;
                    $appendCommandLog(
                        "[merge_concat_copy] suspicious merged.webm size {$mergedSize} bytes; first chunk {$firstChunkBytes} bytes" .
                        PHP_EOL
                    );
                }
            }

            if ($mergeOk && !$mergedLooksSuspicious) {
                [$transcodeOk, $transcodeExit, $transcodeReason] = $runFfmpeg([
                    'ffmpeg', '-y',
                    '-i', $mergedWebm,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                    '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart',
                    $outMp4,
                ], 'transcode_from_merged');

                if (!$transcodeOk) {
                    $rec->update([
                        'status' => 'error',
                        'error_message' => "FFmpeg concat failed: {$transcodeReason} (exit {$transcodeExit})",
                    ]);
                    return;
                }
            } else {
                Log::warning('ffmpeg concat copy failed/suspicious, using direct transcode fallback', [
                    'uuid' => $this->uuid,
                    'exit_code' => $mergeExit,
                    'reason' => $mergeReason,
                    'suspicious_merge' => $mergedLooksSuspicious,
                ]);
                $appendCommandLog("[fallback] using direct concat->mp4 transcode" . PHP_EOL);

                [$fallbackOk, $fallbackExit, $fallbackReason] = $runFfmpeg([
                    'ffmpeg', '-y',
                    '-f', 'concat', '-safe', '0',
                    '-i', $listFile,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                    '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart',
                    $outMp4,
                ], 'fallback_transcode_from_concat');

                if (!$fallbackOk) {
                    $rec->update([
                        'status' => 'error',
                        'error_message' => "FFmpeg concat failed: {$fallbackReason} (exit {$fallbackExit})",
                    ]);
                    return;
                }

                $appendCommandLog("[fallback] direct concat->mp4 succeeded" . PHP_EOL);
            }
        }

        $mp4Contents = @file_get_contents($outMp4);
        if ($mp4Contents === false) {
            $rec->update([
                'status' => 'error',
                'error_message' => 'Cannot read generated output.mp4',
            ]);
            return;
        }

        $mp4Path = "recordings/{$this->uuid}/output.mp4";
        $disk->put($mp4Path, $mp4Contents);

        $appendCommandLog("FINAL MP4 PATH: {$mp4Path}" . PHP_EOL);

        $rec->update([
            'status' => 'done',
            'mp4_path' => $mp4Path,
            'processed_at' => now(),
        ]);
    }
}
