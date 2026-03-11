<?php

namespace AHerzog\Hubjutsu\Console;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;

class HubjutsuPdfFontCommand extends Command
{
    protected $signature = 'hubjutsu:pdf:font {--force}';
    protected $description = 'Sync DOMPDF fonts into the Hubjutsu storage directory';

    public function handle(): int
    {
        $filesystem = new Filesystem();
        $source = config('hubjutsu.pdf.font_source');

        if (!$source || !is_dir($source)) {
            $this->warn('DOMPDF font source directory not found. Install dompdf/dompdf first.');
            return self::FAILURE;
        }

        $destination = config('hubjutsu.pdf.font_dir', storage_path('fonts'));
        $filesystem->ensureDirectoryExists($destination);

        $copied = 0;
        foreach ($this->fontFiles($source) as $file) {
            $copied += $this->copyFont($filesystem, $file, $destination) ? 1 : 0;
        }

        foreach ($this->extraFonts() as $file) {
            $copied += $this->copyFont($filesystem, $file, $destination) ? 1 : 0;
        }

        $this->info("Copied {$copied} font files into {$destination}");
        return self::SUCCESS;
    }

    protected function fontFiles(string $source): iterable
    {
        foreach (glob($source.'/*.{ttf,otf}', GLOB_BRACE) ?: [] as $file) {
            yield $file;
        }
    }

    protected function extraFonts(): array
    {
        $extra = config('hubjutsu.pdf.extra_fonts', []);
        return array_values(array_filter(array_map(function ($path) {
            if (!is_string($path)) {
                return null;
            }

            if (file_exists($path)) {
                return $path;
            }

            $candidate = base_path($path);
            return is_file($candidate) ? $candidate : null;
        }, $extra)));
    }

    protected function copyFont(Filesystem $filesystem, string $source, string $destination): bool
    {
        $target = rtrim($destination, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.basename($source);
        if (!$this->option('force') && $filesystem->exists($target)) {
            return false;
        }

        $filesystem->copy($source, $target);
        return true;
    }
}
