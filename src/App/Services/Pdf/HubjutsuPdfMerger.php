<?php

namespace AHerzog\Hubjutsu\App\Services\Pdf;

use InvalidArgumentException;
use Stringable;
use setasign\Fpdi\Fpdi;

class HubjutsuPdfMerger
{
    protected array $temporaryFiles = [];

    /**
     * Merge multiple PDFs into a single byte stream.
     *
     * @param  array  $sources  File paths, string content, or SplFileInfo/Stringable instances.
     */
    public function merge(array $sources): string
    {
        $merger = new Fpdi();
        foreach ($sources as $source) {
            $path = $this->normalizeSource($source);
            $pageCount = $merger->setSourceFile($path);
            for ($page = 1; $page <= $pageCount; $page++) {
                $templateId = $merger->importPage($page);
                $size = $merger->getTemplateSize($templateId);
                $merger->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $merger->useTemplate($templateId);
            }
        }

        $result = $merger->Output('', 'S');
        $this->cleanupTemporaryFiles();

        return $result;
    }

    protected function normalizeSource(mixed $source): string
    {
        if ($source instanceof \SplFileInfo) {
            return $source->getRealPath() ?: throw new InvalidArgumentException('PDF source has no real path.');
        }

        if ($source instanceof Stringable) {
            $source = (string) $source;
        }

        if (is_string($source)) {
            $trimmed = trim($source);

            if (file_exists($trimmed)) {
                return $trimmed;
            }

            if (str_starts_with($trimmed, '%PDF')) {
                return $this->writeTemporaryPdf($trimmed);
            }
        }

        throw new InvalidArgumentException('Unable to normalize PDF source.');
    }

    protected function writeTemporaryPdf(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'hjpdf');
        file_put_contents($path, $content);
        $this->temporaryFiles[] = $path;
        return $path;
    }

    protected function cleanupTemporaryFiles(): void
    {
        foreach ($this->temporaryFiles as $file) {
            @unlink($file);
        }

        $this->temporaryFiles = [];
    }
}
