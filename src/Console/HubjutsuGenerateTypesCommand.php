<?php
namespace AHerzog\Hubjutsu\Console;

use Faker\Core\File;
use FilesystemIterator;
use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File as FacadesFile;
use Illuminate\Support\Str;
use Lang;
use PHPUnit\Framework\MockObject\Builder\Stub;
use ReflectionClass;
use RuntimeException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\PhpExecutableFinder;
use Symfony\Component\Process\Process;

class HubjutsuGenerateTypesCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:generate:types';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create types.d.ts for the project based on ide-helper:model';


    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {
        
        $this->runCommands([
            'php artisan ide-helper:models -RW',
        ]);
        
        $targetPath = resource_path('js/types/models.d.ts');
        $targetFile = fopen($targetPath, 'w+');
        ftruncate($targetFile, 0);

        fwrite($targetFile, "/** Generated ".date('Y-m-d H:i:s')." */\n\n");

        $replaceTypes = [
            'string' => 'string',
            'text' => 'string',
            'int' => 'number',
            'float' => 'number',
            'bool' => 'boolean',
            'boolean' => 'boolean',
            'datetime' => 'string',
            'array' => '{ [key: string | number]: any }|any[]',
            'object' => '{ [key: string | number]: any }|any',
            'mixed' => '{ [key: string | number]: any }|any'
        ];

        fwrite($targetFile, "export namespace Models {\n");
        $files = glob(app_path('Models/*.php'));
        foreach($files as $file) {
            $modelClass = 'App\\Models\\'.basename($file, '.php');

            $model = new $modelClass();
            $properties = $this->getProperties($model);
            
            fwrite($targetFile, "   export type ".basename($file, '.php')." = {\n");
            foreach($properties['fields'] as $prop) {
                $type = $replaceTypes[$prop['type']] ?? $prop['type'];
                fwrite($targetFile, "       ".$prop['name'].($prop['nullable'] ? '?' : '').": ".$type.";\n");
            }
            fwrite($targetFile, "       [key: string]: any;\n");
            fwrite($targetFile, "   }\n");
        }
        fwrite($targetFile, "}\n");
    }


    public function getProperties($model) {
        $name = str_replace('\\', '.', (strtolower(get_class($model))));
        $casts = $model->getCasts();
        $base = $name;

        $response = [
            'name' =>  __( $name ),
            'fields' => [

            ]
        ];

        $rc = new ReflectionClass(get_class($model));
        preg_match_all('/@property(?<readonly>-read)? (?<type>.*) \$(?<name>[^ ]*)/', $rc->getDocComment(), $matches, PREG_SET_ORDER);

        foreach ($matches as $prop) {
            $prop['name'] = trim($prop['name']);

            if ($prop['name'] == 'use_factory') {
                continue;
            }

            $label = __($base . '.' . $prop['name']);

            if(Lang::has($name.'.'.$prop['name'])) {
                $label = __($name.'.'.$prop['name']);
            }

            $nullable = false;
            if (preg_match('/\|null$/', $prop['type'])) {
                $prop['type'] = preg_replace('/\|null$/', '', $prop['type']);
                $nullable = true;
            }
            $replacements = [
                '\Illuminate\Database\Eloquent\Model' => 'any',
                '\Eloquent' => 'any',
                '\Illuminate\Support\Carbon' => 'date',
                'string' => 'string',
                'array<array-key, mixed>' => '{ [key: string | number]: any }|any[]'

            ];

            if (($casts[$prop['name']]??'') == 'datetime') {
                $replacements['\Illuminate\Support\Carbon'] = 'datetime';
            }
            
            $prop['type'] = str_replace(array_keys($replacements), array_values($replacements), $prop['type']);
            if (preg_match('/\\\Illuminate\\\Databaseany\\\Collection<int, \\\App\\\Models\\\(.*)>/', $prop['type'], $matches)) {
                $prop['type'] = 'Models.'.$matches[1].'[]';
            }

            $prop['type'] = str_replace('\\App\\Models\\', 'Models.', $prop['type']);

            if (strpos($prop['type'], 'Collection') !== false) {
                $prop['type'] = 'any';
            }

            $response['fields'][$prop['name']] = [
                'name' => $prop['name'],
                'label' => $label,
                'type' => $prop['type'],
                'nullable' => $nullable
            ];
        }


        foreach(['updated_at', 'created_at'] as $column) {
            unset($response['fields'][$column]);
        }

        return $response;

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
