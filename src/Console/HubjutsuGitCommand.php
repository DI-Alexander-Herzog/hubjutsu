<?php
namespace AHerzog\Hubjutsu\Console;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\PhpExecutableFinder;
use Symfony\Component\Process\Process;

class HubjutsuGitCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:git';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'pushes and pulls all changes to the installed repos....';



    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {
        $this->info('Pushing and pulling all changes to the installed repos...');

        foreach(glob(base_path('packages/aherzog/hubjutsu*')) as $dir) {
            $projectname = basename($dir);
            $prefix = str_replace(base_path('/'), '', $dir);

            $repo = 'git@git.rent-a-ninja.org:aherzog/'.$projectname.'.git';

            $this->info('Pushing and pulling changes for '.$projectname.'... in '.$prefix);
            
            $this->runCommands([
                "git add packages/aherzog",
                "git commit -m 'sysnc' packages/aherzog",
                "git subtree pull --prefix $prefix $repo main",
                "git subtree push --prefix $prefix $repo main",
                "git subtree pull --prefix $prefix $repo main"
            ]);
        }

        $this->info('All changes pushed and pulled successfully.');
    }



    /**
     * Run the given commands.
     *
     * @param  array  $commands
     * @return void
     */
    protected function runCommands($commands)    
    {

        foreach($commands as $command) {
            
            $process = Process::fromShellCommandline($command, null, null, null, null);
            
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
}
