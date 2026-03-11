<?php

namespace AHerzog\Hubjutsu\Console;

use AHerzog\Hubjutsu\App\Services\Pdf\HubjutsuSamplePdfGenerator;
use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;

class HubjutsuPdfGenerateCommand extends Command
{
    protected $signature = 'hubjutsu:pdf:generate {--output=} {--force}';
    protected $description = 'Generate a sample PDF using the Hubjutsu PDF generator';

    public function handle(Filesystem $filesystem, HubjutsuSamplePdfGenerator $generator): int
    {
        $output = $this->option('output') ?: config('hubjutsu.pdf.sample_output');
        if (! $output) {
            $this->error('No sample output path configured.');
            return self::FAILURE;
        }

        $filesystem->ensureDirectoryExists(dirname($output));

        if (! $this->option('force') && $filesystem->exists($output)) {
            $this->warn('Sample PDF already exists. Use --force to regenerate.');
            return self::SUCCESS;
        }

        $pdf = $generator->render();
        $filesystem->put($output, $pdf);

        $this->info("Sample PDF generated at {$output}");
        return self::SUCCESS;
    }
}
