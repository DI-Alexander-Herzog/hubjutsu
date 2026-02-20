<?php

namespace AHerzog\Hubjutsu;

use AHerzog\Hubjutsu\App\Auth\Permission;
use AHerzog\Hubjutsu\App\Menu\MenuManager;
use AHerzog\Hubjutsu\Console\HubjutsuAppModelCommand;
use AHerzog\Hubjutsu\Console\CleanupRecordingsCommand;
use AHerzog\Hubjutsu\Console\HubjutsuGenerateTypesCommand;
use AHerzog\Hubjutsu\Console\HubjutsuGitCommand;
use AHerzog\Hubjutsu\Console\HubjutsuMakeCommand;
use AHerzog\Hubjutsu\Console\HubjutsuMakeComponentCommand;
use AHerzog\Hubjutsu\Console\HubjutsuSetupCommand;
use Auth;
use Gate;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\ServiceProvider;
use LogViewer;
use Request;

class HubjutsuServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     */
    public function boot()
    {
        /*
         * Optional methods to load your package assets
         */
        // $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'hubjutsu-setup');
        // $this->loadViewsFrom(__DIR__.'/../resources/views', 'hubjutsu-setup');
        //$this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        // $this->loadRoutesFrom(__DIR__.'/routes.php');

        // base permissions
        Permission::addGroup('admin', 'Die Installation bearbeiten');
        Permission::addPermission('admin', 'admin', 'administration');

        Permission::addModel(\App\Models\Hub::class, __('Hub'));
        Permission::addModel(\App\Models\User::class, __('User'));
        Permission::addModel(\App\Models\Role::class, __('Role'));
        Permission::addModel(\App\Models\LearningBundle::class, __('Learning Bundle'));
        Permission::addModel(\App\Models\LearningCourse::class, __('Learning Course'));
        Permission::addModel(\App\Models\LearningModule::class, __('Learning Module'));
        Permission::addModel(\App\Models\LearningSection::class, __('Learning Section'));
        Permission::addModel(\App\Models\LearningLection::class, __('Learning Lection'));
        
        
        // Default allow everything for now
        Gate::after(function ($user, $ability, $arguments) {
            return $user ? true : false;
        });

        Gate::before(function ($user, $ability) {
            if ($user instanceof \App\Models\User) {
                $domain = preg_replace('/^.*@/', '', $user->email);
                if (in_array($domain, config('hubjutsu.super_admin_maildomains') )) {
                    return true;
                }
            }
        });


        if ($this->app->runningInConsole()) {
            $this->commands([
                HubjutsuSetupCommand::class,
                HubjutsuMakeCommand::class,
                HubjutsuGenerateTypesCommand::class,
                HubjutsuMakeComponentCommand::class,
                HubjutsuAppModelCommand::class,
                CleanupRecordingsCommand::class,
            ]);
        }

        Blueprint::macro('user', function () {
            /** @var Blueprint $this */
            $this->unsignedBigInteger('created_by')->nullable();
            $this->unsignedBigInteger('updated_by')->nullable();
            $this->foreign('created_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
            $this->foreign('updated_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
        });

        if (class_exists('LogViewer')) {
            LogViewer::auth(function ($request) {
                if (!Auth::check()) return false;
                
                $domain = preg_replace('/^.*@/', '', Auth::getUser()->email);
                $rootDomain = preg_replace('/^.*\.([^\.]+\.[^\.]+)/', '\1', parse_url(config('app.url'), PHP_URL_HOST) );

                return in_array($domain, [$rootDomain, ...config('hubjutsu.super_admin_maildomains')] );

            });
        }
        
    }
    
    public function register()
    {
        parent::register();
        // Automatically apply the package configuration
        $this->mergeConfigFrom(__DIR__.'/../config/hubjutsu.php', 'hubjutsu');

        // Register the main class to use with the facade
        $this->app->singleton(MenuManager::class, function () {
            return new MenuManager();
        });

        if (class_exists("App\Services\HubManager")) {
            $this->app->singleton(App\Services\HubManager::class, fn($app) => new App\Services\HubManager($app->make(Request::class)));
        }

    }

    public function provides()
    {
        return [
            MenuManager::class,
            HubjutsuMakeCommand::class,
            HubjutsuSetupCommand::class,
            HubjutsuGenerateTypesCommand::class,
            HubjutsuMakeComponentCommand::class,
            HubjutsuAppModelCommand::class,
            CleanupRecordingsCommand::class,
        ];
    }
}
