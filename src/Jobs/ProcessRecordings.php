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

        $chunkDir = $disk->path("recordings/{$this->uuid}/chunks");
        $workDir  = storage_path("app/tmp_recordings/{$this->uuid}");
        if (!is_dir($workDir)) mkdir($workDir, 0775, true);

        $fileList = "{$workDir}/filelist.txt";
        $outMp4   = "{$workDir}/output.mp4";

        $last = max(0, (int)$rec->last_chunk_index - 1);

        $lines = [];
        for ($i = 0; $i <= $last; $i++) {
            $chunk = sprintf("%s/chunk_%06d.webm", $chunkDir, $i);
            if (!file_exists($chunk)) {
                $rec->update(['status'=>'error','error_message'=>"Missing chunk {$i}"]);
                return;
            }
            $lines[] = "file '" . str_replace("'", "'\\''", $chunk) . "'";
        }
        file_put_contents($fileList, implode(PHP_EOL, $lines) . PHP_EOL);

        // Robust: concat demuxer + transcode -> mp4
        $p = new Process([
            'ffmpeg','-y',
            '-f','concat','-safe','0',
            '-i', $fileList,
            '-c:v','libx264','-preset','veryfast','-crf','23',
            '-c:a','aac','-b:a','128k',
            '-movflags','+faststart',
            $outMp4
        ]);
        $p->setTimeout($this->timeout);
        $p->run();

        if (!$p->isSuccessful()) {
            $rec->update(['status'=>'error','error_message'=>$p->getErrorOutput()]);
            return;
        }

        $mp4Path = "recordings/{$this->uuid}/output.mp4";
        $disk->put($mp4Path, file_get_contents($outMp4));

        $rec->update([
            'status' => 'done',
            'mp4_path' => $mp4Path,
            'processed_at' => now(),
        ]);
    }
}
