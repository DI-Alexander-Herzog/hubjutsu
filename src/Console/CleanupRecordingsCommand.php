<?php

namespace AHerzog\Hubjutsu\Console;

use App\Models\MediaRecording;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupRecordingsCommand extends Command
{
    protected $signature = 'hubjutsu:recordings:cleanup {--days=3 : Retention in days after processing}';

    protected $description = 'Delete processed recordings (files + DB rows) older than retention period.';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = Carbon::now()->subDays($days);

        $disk = Storage::disk('recordings_private');
        $deleted = 0;

        MediaRecording::query()
            ->where('status', 'done')
            ->whereNotNull('processed_at')
            ->where('processed_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById(100, function ($records) use (&$deleted, $disk): void {
                foreach ($records as $record) {
                    $uuid = (string) $record->uuid;

                    if (!empty($record->mp4_path) && $disk->exists($record->mp4_path)) {
                        $disk->delete($record->mp4_path);
                    }

                    $disk->deleteDirectory("recordings/{$uuid}/chunks");
                    $disk->deleteDirectory("recordings/{$uuid}");

                    $tmpDir = storage_path("app/tmp_recordings/{$uuid}");
                    if (is_dir($tmpDir)) {
                        $this->deleteLocalDirectory($tmpDir);
                    }

                    $record->delete();
                    $deleted++;
                }
            });

        $this->info("Cleanup complete. Deleted {$deleted} recording(s) older than {$days} day(s).");

        return self::SUCCESS;
    }

    private function deleteLocalDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $fullPath = $path.DIRECTORY_SEPARATOR.$item;
            if (is_dir($fullPath)) {
                $this->deleteLocalDirectory($fullPath);
            } else {
                @unlink($fullPath);
            }
        }

        @rmdir($path);
    }
}

