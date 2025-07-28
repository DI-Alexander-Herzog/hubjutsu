<?php
namespace AHerzog\Hubjutsu\Console;

use Faker\Core\File;
use FilesystemIterator;
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

class HubjutsuSetupCommand extends Command
{

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hubjutsu:setup {--update : Just update new files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup all packages for Hubjutsu';



    protected $filesystem = null;
    protected function getFilesystem() {
        if ($this->filesystem === null) {
            $this->filesystem = new Filesystem();
        }
        return $this->filesystem;
    }

    /**
     * Replace a given string within a given file.
     *
     * @param  string  $search
     * @param  string  $replace
     * @param  string  $path
     * @return void
     */
    protected function replaceInFile($search, $replace, $path)
    {
        file_put_contents($path, str_replace($search, $replace, file_get_contents($path)));
    }

    /**
     * Get the path to the appropriate PHP binary.
     *
     * @return string
     */
    protected function phpBinary()
    {
        return (new PhpExecutableFinder())->find(false) ?: 'php';
    }

    protected function copyDirectoryIfNotExists($directory, $destination, $options = null) {        
        $filesystem = $this->getFilesystem();

        if (! $filesystem->isDirectory($directory)) {
            return false;
        }

        $options = $options ?: FilesystemIterator::SKIP_DOTS;
        $filesystem->ensureDirectoryExists($destination, 0777);
        $items = new FilesystemIterator($directory, $options);

        foreach ($items as $item) {
            $target = $destination.'/'.$item->getBasename();

            if ($item->isDir()) {
                $path = $item->getPathname();

                if (! $this->copyDirectoryIfNotExists($path, $target, $options)) {
                    return false;
                }

            } elseif ($filesystem->exists($target)) {
                continue;

            } elseif (!$filesystem->copy($item->getPathname(), $target)) {
                return false;
            }
        }

        return true;
    }

    protected function installStatefulApi() {
        $bootstrapApp = file_get_contents(base_path('bootstrap/app.php'));
        if (!Str::contains($bootstrapApp, '->statefulApi()')) {
            $bootstrapApp = str_replace(
                '->withMiddleware(function (Middleware $middleware) {',
                '->withMiddleware(function (Middleware $middleware) {'
                        .PHP_EOL."        \$middleware->statefulApi();",
                $bootstrapApp,
            );
            file_put_contents(base_path('bootstrap/app.php'), $bootstrapApp);
        }
    }


    /**
     * Install the given middleware names into the application.
     *
     * @param  array|string  $name
     * @param  string  $group
     * @param  string  $modifier
     * @return void
     */
    protected function installMiddleware($names, $group = 'web', $modifier = 'append')
    {
        $bootstrapApp = file_get_contents(base_path('bootstrap/app.php'));

        $names = collect(Arr::wrap($names))
            ->filter(fn ($name) => ! Str::contains($bootstrapApp, $name))
            ->whenNotEmpty(function ($names) use ($bootstrapApp, $group, $modifier) {
                $names = $names->map(fn ($name) => "$name")->implode(','.PHP_EOL.'            ');

                $bootstrapApp = str_replace(
                    '->withMiddleware(function (Middleware $middleware) {',
                    '->withMiddleware(function (Middleware $middleware) {'
                        .PHP_EOL."        \$middleware->$group($modifier: ["
                        .PHP_EOL."            $names,"
                        .PHP_EOL.'        ]);'
                        .PHP_EOL,
                    $bootstrapApp,
                );

                file_put_contents(base_path('bootstrap/app.php'), $bootstrapApp);
            });
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


    /**
     * Install the installation.
     *
     * @return int|null
     */
    public function handle()
    {

        $setup = !$this->option('update');
        

        if ($setup) {   
            // Install Inertia...
            if (! $this->requireComposerPackages(['inertiajs/inertia-laravel', 'laravel/sanctum', 'tightenco/ziggy', 'opcodesio/log-viewer'])) {
                return 1;
            }

            if (!$this->requireComposerPackages(['barryvdh/laravel-ide-helper'], true)) {
                return 1;
            }

            $this->components->info('Installing NPM - might take a while...');
            $this->runCommands([
                'npm install '.
                '@headlessui/react @inertiajs/react @tailwindcss/forms @vitejs/plugin-react autoprefixer postcss tailwindcss@3 react react-dom '.
                '@types/node @types/react @types/react-dom @types/ziggy-js typescript laravel-react-i18n ' . 
                '@heroicons/react classnames react-dropzone uuid'
            ]);

            $this->components->info('Installing npm types - might take a while as well...');
            $this->runCommands(['npm install -D sass @types/qs']);

            $this->components->info('Running artisan commands...');
            $this->runCommands(['php artisan lang:publish']);
            $this->runCommands(['php artisan install:api --without-migration-prompt']);
            $this->runCommands(['php artisan vendor:publish --tag="log-viewer-config"']);
            $this->runCommands(['php artisan vendor:publish --tag=log-viewer-assets --force']);
            $this->runCommands(['php artisan storage:link']);

        }

        $filesystem = new Filesystem();
        foreach($filesystem->glob(__DIR__ . '/../../database/migrations/*.php') as $file) {
            if ($filesystem->glob(database_path('migrations/*_'.basename($file)))) {
                $this->output->info('Migration already exists: '.basename($file));
            } else {
                $filesystem->copy($file, database_path('migrations/'. date('Y_m_d_His_') .basename($file)));
            }
        }

        // Controllers...
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/app/Http/Controllers', app_path('Http/Controllers'));

        // Requests...
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/app/Http/Requests', app_path('Http/Requests'));

        if ($setup) {   
            if (!$filesystem->exists(storage_path('app/public/img/brandimage.jpeg'))) {
                $filesystem->ensureDirectoryExists(storage_path('app/public/img'));
                $filesystem->copy(__DIR__ . '/../../resources/images/brandimage.jpeg', storage_path('app/public/img/brandimage.jpeg'));
            }

            $filesystem->copy(__DIR__ . '/../../stubs/database/seeder/HubjutsuSeeder.php', database_path('seeders/HubjutsuSeeder.php'));

            
            // Middleware...
            $this->installMiddleware([
                '\App\Http\Middleware\HandleInertiaRequests::class',
                '\Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class',
            ]);
            $this->installStatefulApi();
            

            $filesystem->ensureDirectoryExists(app_path('Http/Middleware'));
            $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/app/Http/Middleware/', app_path('Http/Middleware'));
            

            // Views...
            copy(__DIR__.'/../../stubs/resources/views/app.blade.php', resource_path('views/app.blade.php'));

            @unlink(resource_path('views/welcome.blade.php'));
        }

        // Components + Pages...
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/resources/js/Components', resource_path('js/Components'));
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/resources/js/Layouts', resource_path('js/Layouts'));
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/resources/js/Pages', resource_path('js/Pages'));
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/resources/js/types', resource_path('js/types'));
    

        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/app/Models/', app_path('Models'));
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/app/Policies/', app_path('Policies'));

        $this->copyIfNotContains(__DIR__.'/../../stubs/app/Models/User.php', app_path('Models'). '/User.php', 'AHerzog\Hubjutsu\Models\User');
        
        $this->copyDirectoryIfNotExists(__DIR__.'/../../stubs/stubs/', base_path('stubs'));
        
        if ($setup) {   
            $this->setNpmPackageName();
            
            // Tailwind / Vite...

            $this->copyIfNotContains(__DIR__.'/../../stubs/resources/css/app.scss', resource_path('css/app.scss'), "@import '../../vendor/aherzog/hubjutsu/resources/css/hubjutsu.scss';");
            copy(__DIR__.'/../../stubs/postcss.config.js', base_path('postcss.config.js'));
            copy(__DIR__.'/../../stubs/tailwind.config.dist.js', base_path('tailwind.config.js'));
            copy(__DIR__.'/../../stubs/vite.config.dist.js', base_path('vite.config.js'));

            copy(__DIR__.'/../../stubs/tsconfig.dist.json', base_path('tsconfig.json'));
            copy(__DIR__.'/../../stubs/resources/js/app.tsx', resource_path('js/app.tsx'));

            copy(__DIR__.'/../../stubs/resources/js/bootstrap.ts', resource_path('js/bootstrap.ts'));
            
            if (file_exists(resource_path('js/bootstrap.js'))) {
                unlink(resource_path('js/bootstrap.js'));
            }

            // Routes...
            $this->copyIfNotContains(__DIR__.'/../../stubs/routes/web.php', base_path('routes/web.php'), "require __DIR__ .'/../vendor/aherzog/hubjutsu/routes/hubjutsu.php';", true);
            $this->copyIfNotContains(__DIR__.'/../../stubs/routes/api.php', base_path('routes/api.php'), "require __DIR__ .'/../vendor/aherzog/hubjutsu/routes/hubjutsuapi.php';", true);
            $filesystem->copyDirectory(__DIR__.'/../../stubs/tests/Feature', base_path('tests/Feature'));

            $this->replaceInFile('"vite build', '"tsc && VITE_CJS_TRACE=true vite build', base_path('package.json'));
            $this->replaceInFile('.jsx', '.tsx', base_path('vite.config.js'));
            $this->replaceInFile('.jsx', '.tsx', resource_path('views/app.blade.php'));
            $this->replaceInFile('.vue', '.tsx', base_path('tailwind.config.js'));

            if (file_exists(resource_path('js/app.js'))) {
                unlink(resource_path('js/app.js'));
            }

            foreach(['.env', '.env.example'] as $file) {
                $contents = file_get_contents(base_path($file));
                if (strpos($contents, 'VITE_SERVER_HOST') === false) {
                    $url = config('app.url');

                    $contents = trim($contents).
                        PHP_EOL.'VITE_SERVER_HOST="'.parse_url($url, PHP_URL_HOST).'"'.
                        PHP_EOL;
                }
                
                if (strpos($contents, 'VITE_SERVER_HTTPS_CERT') === false) {
                    $contents = trim($contents).
                        PHP_EOL.'#VITE_SERVER_HTTPS_CERT="/opt/homebrew/etc/ssl/local.crt"'. 
                        PHP_EOL.'#VITE_SERVER_HTTPS_CERT="/etc/ssl/ah/test.cert"'.
                        PHP_EOL;
                }

                if (strpos($contents, 'VITE_SERVER_HTTPS_KEY') === false) {
                    $contents = trim($contents).
                        PHP_EOL.'#VITE_SERVER_HTTPS_KEY="/opt/homebrew/etc/ssl/local.key"'. 
                        PHP_EOL.'#VITE_SERVER_HTTPS_KEY="/etc/ssl/ah/test.key"'.
                        PHP_EOL;
                }

                if (strpos($contents, 'ADMIN_PASSWORD') === false) {
                    $contents = trim($contents).
                        PHP_EOL.'#ADMIN_PASSWORD=admin'.
                        PHP_EOL;
                }

                
                $contents = file_put_contents(base_path($file), $contents);
            }

            $this->components->info('Building node...');
            $this->runCommands(['npm run build']);
            
            $this->runCommands(['php artisan migrate --force']);
            $this->runCommands(['php artisan db:seed HubjutsuSeeder --force']);
        } else {
            $this->runCommands([
                'php artisan migrate --force',
                'php artisan ide-helper:model -RW',
                'npm run build'
            ]);
        }


        
        $this->line('');
        $this->components->info('Hubjutsu scaffolding installed successfully.');
    }

    protected function copyIfNotContains($from, $to, $string, $append = false)  {
        if (!file_exists($to)) {
            copy($from, $to);
        }

        if (!Str::contains(($content = file_get_contents($to)), $string)) {
            if ($append) {
                file_put_contents($to, $content . PHP_EOL . PHP_EOL . $string);
            } else {
                copy($from, $to);
            }
        }
    }

    /**
     * Installs the given Composer Packages into the application.
     *
     * @param  array  $packages
     * @param  bool  $asDev
     * @return bool
     */
    protected function requireComposerPackages(array $packages, $asDev = false)
    {
        
        $command = array_merge(
            ['composer', 'require'],
            $packages,
            $asDev ? ['--dev'] : [],
        );

        return (new Process($command, base_path(), ['COMPOSER_MEMORY_LIMIT' => '-1']))
            ->setTimeout(null)
            ->run(function ($type, $output) {
                $this->output->write($output);
            }) === 0;
    }

    protected function setNpmPackageName() {
        $content = json_decode(file_get_contents(base_path('package.json')));
        $content->name = Str::slug(strtolower(config('app.name')));
        file_put_contents(base_path('package.json'), json_encode($content, JSON_PRETTY_PRINT));
    }

     /**
     * Removes the given Composer Packages from the application.
     *
     * @param  array  $packages
     * @param  bool  $asDev
     * @return bool
     */
    protected function removeComposerPackages(array $packages, $asDev = false)
    {
       
        $command = array_merge(
            ['composer', 'remove'],
            $packages,
            $asDev ? ['--dev'] : [],
        );

        return (new Process($command, base_path(), ['COMPOSER_MEMORY_LIMIT' => '-1']))
            ->setTimeout(null)
            ->run(function ($type, $output) {
                $this->output->write($output);
            }) === 0;
    }
}
