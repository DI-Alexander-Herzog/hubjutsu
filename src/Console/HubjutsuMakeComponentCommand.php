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

class HubjutsuMakeComponentCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:component {name} ';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new component for Hubjutsu react';


    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {
        $name = $this->argument('name');
        $slug = Str::snake($name);

        $root = realpath(__DIR__ . '/../..');
        $parts = explode('/', $name);
        $componentDir = $root . '/resources/js/components';
        $stubsDir = $root . '/stubs/resources/js/components';
        
        $nameSpace = '';
        $componentName = array_pop($parts);

        foreach($parts as $part) {
            $nameSpace .= '/' . ucfirst($part);
            
        }

        $fs = new Filesystem();
        $fs->ensureDirectoryExists($componentDir . $nameSpace);
        $fs->ensureDirectoryExists($stubsDir . $nameSpace);

        file_put_contents($componentDir . $nameSpace .'/'.$componentName.'.tsx', join("\n", [
            'import classNames from "classnames";',
            '',
            "type {$componentName}Type = {",
            "    children?: ReactNode,",
            "}",
            "",
            "export default function $componentName({children, ...props} : {$componentName}Type ) {",
            '    return (',
            '        <div className="container">',
            '            <h1>Hello World</h1>',
            '        </div>',
            '    );',
            '}',
        ]));

        file_put_contents($stubsDir . $nameSpace .'/'.$componentName.'.tsx', join("\n", [
            "import $componentName from '@hubjutsu/Components$nameSpace/$componentName';",
            "export default $componentName;"
        ]));
        
        

        $this->runCommand('hubjutsu:setup', ['--update'], $this->output);
    }
}
