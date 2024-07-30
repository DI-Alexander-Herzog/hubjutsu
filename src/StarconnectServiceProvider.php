<?php

namespace AHerzog\Starconnect;

use AHerzog\StarconnectSetup\Console\StarconnectGitCommand;
use AHerzog\StarconnectSetup\Console\StarconnectSetupCommand;
use Illuminate\Support\ServiceProvider;

class StarconnectServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     */
    public function boot()
    {
        /*
         * Optional methods to load your package assets
         */
        // $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'starconnect-setup');
        // $this->loadViewsFrom(__DIR__.'/../resources/views', 'starconnect-setup');
        // $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        // $this->loadRoutesFrom(__DIR__.'/routes.php');

        if ($this->app->runningInConsole()) {
            
            $this->commands([
                StarconnectSetupCommand::class,
                StarconnectGitCommand::class,
            ]);
        }
    }

    public function provides()
    {
        return [
            StarconnectSetupCommand::class,
            StarconnectGitCommand::class,
        ];
    }
}
