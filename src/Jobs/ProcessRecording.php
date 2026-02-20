<?php


namespace AHerzog\Hubjutsu\Jobs;

use App\Models\MediaRecording;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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

        $chunkDir = $disk->path("recordings/{$this->uuid}/chunks");
        $workDir  = storage_path("app/tmp_recordings/{$this->uuid}");
        if (!is_dir($workDir)) mkdir($workDir, 0775, true);

        $inWebm   = "{$workDir}/input.webm";
        $outMp4   = "{$workDir}/output.mp4";

        $last = max(0, (int)$rec->last_chunk_index - 1);

        $out = @fopen($inWebm, 'wb');
        if ($out === false) {
            $rec->update(['status' => 'error', 'error_message' => 'Cannot create input.webm']);
            return;
        }

        for ($i = 0; $i <= $last; $i++) {
            $chunk = sprintf("%s/chunk_%06d.webm", $chunkDir, $i);
            if (!file_exists($chunk)) {
                fclose($out);
                $rec->update(['status'=>'error','error_message'=>"Missing chunk {$i}"]);
                return;
            }

            $in = @fopen($chunk, 'rb');
            if ($in === false) {
                fclose($out);
                $rec->update(['status' => 'error', 'error_message' => "Cannot read chunk {$i}"]);
                return;
            }

            stream_copy_to_stream($in, $out);
            fclose($in);
        }
        fclose($out);

        // Transcode merged WebM stream to MP4
        $p = new Process([
            'ffmpeg','-y',
            '-i', $inWebm,
            '-c:v','libx264','-preset','medium','-crf','20',
            '-pix_fmt','yuv420p',
            '-c:a','aac','-b:a','192k',
            '-movflags','+faststart',
            $outMp4
        ]);
        $p->setTimeout($this->timeout);

        try {
            $p->run();
        } catch (ProcessStartFailedException $e) {
            // Happens when ffmpeg is not installed or not resolvable in PATH.
            $rec->update([
                'status' => 'error',
                'error_message' => 'Error starting ffmpeg process: ' . $e->getMessage(),
            ]);
            return;
        }

        if (!$p->isSuccessful()) {
            $error = trim($p->getErrorOutput());
            if ($error === '') {
                $error = trim($p->getOutput());
            }
            if ($error === '') {
                $error = 'ffmpeg failed with exit code ' . $p->getExitCode();
            }
            $rec->update(['status' => 'error', 'error_message' => 'Error in ffmpeg: ' . $error]);
            return;
        }

        $mp4Path = "recordings/{$this->uuid}/output.mp4";
        $disk->put($mp4Path, file_get_contents($outMp4));

        // Source chunks are no longer needed after successful render.
        //$disk->deleteDirectory("recordings/{$this->uuid}/chunks");

        $rec->update([
            'status' => 'done',
            'mp4_path' => $mp4Path,
            'processed_at' => now(),
        ]);
    }
}
