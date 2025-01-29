<?php
namespace AHerzog\Hubjutsu\Console;

use Faker\Core\File;
use FilesystemIterator;
use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File as FacadesFile;
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

        // migration
        if (!glob($root . '/database/migrations/hubjutsu_*_create_' . $pluralslug . '.php')) {
            $nextNr = glob($root . '/database/migrations/hubjutsu_*.php');
            $content = str_replace('{{ table }}', $pluralslug, file_get_contents($root . '/stubs/stubs/migration.create.stub'));
            file_put_contents($root . '/database/migrations/hubjutsu_'. sprintf('%02d', ($nextNr+1) ).'_create_' . $pluralslug . '.php', $content);
        } else {
            $this->error('The migration for ' . $name . ' already exists!');
        }

        // model
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

        
        // controller
        $controllerTarget = $root . '/src/Http/Controllers/' . $name . 'Controller.php';
        if (file_exists($controllerTarget)) {
            $this->error('Controller for ' . $name . ' already exists!');
        } else  {
            $replace = [
                '{{ namespace }}' => "AHerzog\\Hubjutsu\\Http\\Controllers",
                '{{ namespacedModel }}' => "App\\Models\\" . $name,
                '{{ rootNamespace }}' => "App\\",
                '{{ namespacedRequests }}' => "Illuminate\\Http\\Request;",
                '{{ storeRequest }}' => "Request",
                '{{ class }}' => $name . "Controller",
                '{{ updateRequest }}' => "Request",
                '{{ model }}' => $name,
                '{{ modelVariable }}' => $slug,
                '{{ modelVariablePlural }}' => $pluralslug,
            ];

            $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($root . '/stubs/stubs/controller.model.stub'));
            file_put_contents($controllerTarget, $content);
        }

        $stubTarget = $root . '/stubs/app/Http/Controllers/' . $name . 'Controller.php';
        if (file_exists($stubTarget)) {
            $this->error('StubController for ' . $name . ' already exists!');
        } else  {
            $content = [
                '<?php',
                'namespace App\Http\Controllers;',
                'class '.$name.'Controller extends \\AHerzog\\Hubjutsu\\Http\\Controllers\\'.$name.'Controller {',
                '}'
            ];
            file_put_contents($stubTarget, implode(PHP_EOL.PHP_EOL, $content));
        }

        // routes
        $rules = [
            0 => "",
            1 => "Route::middleware(['auth', 'verified'])->group(function () {",
            2 => "    Route::get('/".$pluralslug."', [".$name."Controller::class, 'index'])->name('".$pluralslug.".index');",
            3 => "    Route::get('/".$pluralslug."/create', [".$name."Controller::class, 'create'])->name('".$pluralslug.".create');",
            4 => "    Route::post('/".$pluralslug."', [".$name."Controller::class, 'store'])->name('".$pluralslug.".store');",
            5 => "    Route::get('/".$pluralslug."/{".$slug."}', [".$name."Controller::class, 'show'])->name('".$pluralslug.".show');",
            6 => "    Route::get('/".$pluralslug."/{".$slug."}/edit', [".$name."Controller::class, 'edit'])->name('".$pluralslug.".edit');",
            7 => "    Route::addRoute(['PUT', 'POST', 'PATCH'], '/".$pluralslug."/{".$slug."}', [".$name."Controller::class, 'update'])->name('".$pluralslug.".update');",
            8 => "    Route::delete('/".$pluralslug."/{".$slug."}', [".$name."Controller::class, 'destroy'])->name('".$pluralslug.".destroy');",
            9 => "});",
        ];
        $routesFile = $root . '/routes/hubjutsu.php';
        $routesFileContent = file_get_contents($routesFile);
        $useFound = false;
        if (strpos($routesFileContent, $rules[2]) === false) {
            $contentLines = [];
            $lines = explode(PHP_EOL, $routesFileContent);

            foreach($lines as $line) {
                if (strpos($line, 'use App') === 0 ) {
                    $useFound = true;
                } elseif ($useFound) {
                    $useFound = false;
                    $contentLines[] = 'use App\\Http\\Controllers\\'.$name.'Controller;';

                    foreach($rules as $rule) {
                        $contentLines[] = $rule;
                    }
                }
                $contentLines[] = $line;
            }
            file_put_contents($routesFile, implode(PHP_EOL, $contentLines));

        } else {
            $this->error('Routes for ' . $name . ' already exist!');
        }


        // page.tsx
        $pages = ['Index', 'Create', 'Edit', 'View', 'Form'];
        foreach($pages as $page) {
            $pageTarget = $root . '/resources/js/pages/' . $name . '/'.$page.'.tsx';
            if (file_exists($pageTarget)) {
                $this->error($page . ' page for ' . $name . ' already exists!');
            } else  {
                $replace = [
                    '{{ name }}' => $name,
                    '{{ model }}' => $name,
                    '{{ modelVariable }}' => $slug,
                    '{{ modelVariablePlural }}' => $pluralslug,
                ];
                if (!file_exists(dirname($pageTarget))) {
                    mkdir(dirname($pageTarget), 0755, true);
                }
                $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($root . '/stubs/stubs/pages/'.$page.'.stub'));
                file_put_contents($pageTarget, $content);
            }

            $stubTarget = $root . '/stubs/resources/js/Pages/' . $name . '/'.$page.'.tsx';
            if (file_exists($stubTarget)) {
                $this->error($page . ' stub page for ' . $name . ' already exists!');
            } else  {
                $content = [
                    "import ".$name.$page." from '@hubjutsu/Pages/".$name."/".$page."';",
                    "export default ".$name.$page.";",
                ];
                if (!file_exists(dirname($stubTarget))) {
                    mkdir(dirname($stubTarget), 0755, true);
                }
                file_put_contents($stubTarget, implode(PHP_EOL.PHP_EOL, $content));
            }
        }
        

        $this->runCommands(['php artisan hubjutsu:setup --update']);
    }

     /**
     * Run the given commands.
     *
     * @param  array  $commands
     * @return void
     */
    protected function runCommands($commands)
    {
        $process = Process::fromShellCommandline(implode(' && ', $commands), null, null, null, null);

        if ('\\' !== DIRECTORY_SEPARATOR && file_exists('/dev/tty') && is_readable('/dev/tty')) {
            try {
                $process->setTty(true);
            } catch (RuntimeException $e) {
                $this->output->writeln('  <bg=yellow;fg=black> WARN </> '.$e->getMessage().PHP_EOL);
            }
        }

        $process->run(function ($type, $line) {
            $this->output->write('    '.$line);
        });
    }
}
