<?php
namespace AHerzog\Hubjutsu\Console;

use Faker\Core\File;
use FilesystemIterator;
use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use PHPUnit\Framework\MockObject\Builder\Stub;
use RuntimeException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\PhpExecutableFinder;
use Symfony\Component\Process\Process;

class HubjutsuMakeCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:make {name} {--skip-controller}  {--skip-model} {--skip-migration} {--skip-seeder} {--skip-policy} {--skip-middleware} {--skip-page} {--skip-route} {--update} {--skip-view}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create Scaffold for Hubjutsu';


    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {
        $name = $this->argument('name');
        $slug = Str::slug($name);

        $plural = Str::plural($name);
        $pluralslug = Str::plural($slug);

        $root = realpath(__DIR__ . '/../..');

        if (!glob($root . '/database/migrations/hubjutsu_*_create_' . $pluralslug . '.php')) {
            $nextNr = glob($root . '/database/migrations/hubjutsu_*.php');
            $content = str_replace('{{ table }}', $pluralslug, file_get_contents($root . '/stubs/stubs/migration.create.stub'));
            file_put_contents($root . '/database/migrations/hubjutsu_'. sprintf('%02d', ($nextNr+1) ).'_create_' . $pluralslug . '.php', $content);
        } else {
            $this->error('The migration for ' . $name . ' already exists!');
        }

        $modelTarget = $root . '/src/Models/' . $name . '.php';
        if (file_exists($modelTarget)) {
            $this->error('Model for ' . $name . ' already exists!');
        } else  {
            $replace = [
                '{{ namespace }}' => "AHerzog\\Hubjutsu\\Models",
                '{{ class }}' => $name,
            ];
            $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($root . '/stubs/stubs/model.stub'));
            file_put_contents($modelTarget, $content);
        }

        $stubTarget = $root . '/stubs/app/Models/' . $name . '.php';
        if (file_exists($stubTarget)) {
            $this->error('Stub for model ' . $name . ' already exists!');
        } else {
            $content = [
                '<?php',
                'namespace App\Models;',
                'class '.$name.' extends \\AHerzog\\Hubjutsu\\Models\\'.$name.' {',
                '}'
            ];
            file_put_contents($stubTarget, implode(PHP_EOL.PHP_EOL, $content));
        }

    }
}
