<?php

namespace AHerzog\Hubjutsu;

use AHerzog\Hubjutsu\App\Menu\MenuManager;
use AHerzog\Hubjutsu\Console\HubjutsuGitCommand;
use AHerzog\Hubjutsu\Console\HubjutsuSetupCommand;
use AHerzog\Hubjutsu\Events\BuildMenuEvent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\ServiceProvider;

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

        if ($this->app->runningInConsole()) {
            $this->commands([
                HubjutsuSetupCommand::class
            ]);
        }

        Blueprint::macro('user', function () {
            /** @var Blueprint $this */
            $this->unsignedBigInteger('created_by')->nullable();
            $this->unsignedBigInteger('updated_by')->nullable();
            $this->foreign('created_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
            $this->foreign('updated_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
        });
    }
    
    public function register()
    {
        parent::register();
        // Automatically apply the package configuration
        $this->mergeConfigFrom(__DIR__.'/../config/hubjutsu.php', 'hubjutsu');

        // Register the main class to use with the facade
        $this->app->singleton('menuManager', function () {
            return new MenuManager();
        });


    }

    public function provides()
    {
        return [
            MenuManager::class,
            HubjutsuSetupCommand::class
        ];
    }
}
