<?php

namespace AHerzog\Hubjutsu;

use AHerzog\Hubjutsu\Console\HubjutsuGitCommand;
use AHerzog\Hubjutsu\Console\HubjutsuSetupCommand;
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
        // $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        // $this->loadRoutesFrom(__DIR__.'/routes.php');

        if ($this->app->runningInConsole()) {
            $this->commands([
                HubjutsuSetupCommand::class,
                HubjutsuGitCommand::class,
            ]);
        }
    }

    public function provides()
    {
        return [
            HubjutsuSetupCommand::class,
            HubjutsuGitCommand::class,
        ];
    }
}
