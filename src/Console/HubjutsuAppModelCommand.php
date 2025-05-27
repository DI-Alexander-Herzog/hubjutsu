<?php
namespace AHerzog\Hubjutsu\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

class HubjutsuAppModelCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:app:model {name} ';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create Scaffold for current app';


    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {
        $name = $this->argument('name');
        $slug = Str::snake($name);

        $plural = Str::plural($name);
        $pluralslug = Str::plural($slug);

        $app_root = base_path();
        $package_root = realpath(__DIR__ . '/../..');

        // migration
        if (!glob($app_root . '/database/migrations/*_appmodel_create_' . $pluralslug . '.php')) {
            $content = str_replace('{{ table }}', $pluralslug, file_get_contents($package_root . '/stubs/stubs/migration.create.stub'));
            file_put_contents($app_root . '/database/migrations/'.date('Y_m_d_His').'_appmodel_create_'. $pluralslug . '.php', $content);
        } else {
            $this->error('The migration for ' . $name . ' already exists!');
        }

        // model
        $modelTarget = $app_root . '/app/Models/' . $name . '.php';
        if (file_exists($modelTarget)) {
            $this->error('Model for ' . $name . ' already exists!');
        } else  {
            $replace = [
                '{{ namespace }}' => "App\\Models",
                '{{ class }}' => $name,
            ];
            $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($package_root . '/stubs/stubs/model.stub'));
            file_put_contents($modelTarget, $content);
        }
        
        // controller
        $controllerTarget = $app_root . '/app/Http/Controllers/' . $name . 'Controller.php';
        if (file_exists($controllerTarget)) {
            $this->error('Controller for ' . $name . ' already exists!');
        } else  {
            $replace = [
                '{{ namespace }}' => "App\\Http\\Controllers",
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

            $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($package_root . '/stubs/stubs/controller.model.stub'));
            file_put_contents($controllerTarget, $content);
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
        
        $routesFile = $app_root . '/routes/web.php';
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
                    $rules = [];
                }
                $contentLines[] = $line;
            }
            if (!$useFound && $rules) {
                array_splice($contentLines, 1, 0, 'use App\\Http\\Controllers\\'.$name.'Controller;');
                foreach($rules as $rule) {
                    $contentLines[] = $rule;
                }
            }
            file_put_contents($routesFile, implode(PHP_EOL, $contentLines));

        } else {
            $this->error('Routes for ' . $name . ' already exist!');
        }


        // page.tsx
        $pages = ['Index', 'Create', 'Edit', 'View', 'Form'];
        foreach($pages as $page) {
            $pageTarget = $app_root . '/resources/js/Pages/' . $name . '/'.$page.'.tsx';
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
                $content = str_replace(array_keys($replace), array_values($replace), file_get_contents($package_root . '/stubs/stubs/pages/'.$page.'.stub'));
                file_put_contents($pageTarget, $content);
            }
        }
        
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
