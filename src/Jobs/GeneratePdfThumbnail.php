<?php

namespace AHerzog\Hubjutsu\Jobs;

use App\Models\Media;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GeneratePdfThumbnail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(public int $mediaId)
    {
    }

    public function handle(): void
    {
        $media = Media::find($this->mediaId);
        if (!$media) {
            return;
        }

        $meta = is_array($media->meta) ? $media->meta : [];
        data_set($meta, 'pdf.thumbnail.status', 'processing');
        data_set($meta, 'pdf.thumbnail.processing_at', now()->toIso8601String());
        $media->meta = $meta;
        $media->saveQuietly();

        $media->generatePdfThumbnailVariant();
    }

    public function failed(\Throwable $e): void
    {
        $media = Media::find($this->mediaId);
        if (!$media) {
            return;
        }

        $meta = is_array($media->meta) ? $media->meta : [];
        data_set($meta, 'pdf.thumbnail.status', 'failed');
        data_set($meta, 'pdf.thumbnail.failed_at', now()->toIso8601String());
        data_set($meta, 'pdf.thumbnail.error', (string) $e->getMessage());
        $media->meta = $meta;
        $media->saveQuietly();
    }
}
