<?php

namespace AHerzog\Hubjutsu;

use AHerzog\Hubjutsu\App\Auth\Permission;
use AHerzog\Hubjutsu\App\Menu\MenuManager;
use AHerzog\Hubjutsu\App\Services\Integrations\IntegrationServiceRegistry as PackageIntegrationServiceRegistry;
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
use Illuminate\Database\Eloquent\Model;
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
        $this->loadJsonTranslationsFrom(__DIR__.'/../resources/lang');
        // $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'hubjutsu-setup');
        // $this->loadViewsFrom(__DIR__.'/../resources/views', 'hubjutsu-setup');
        //$this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        // $this->loadRoutesFrom(__DIR__.'/routes.php');

        // base permissions
        Permission::addGroup('admin', 'Die Installation bearbeiten');
        Permission::addPermission('admin', 'admin', 'administration');

        if (class_exists("\App\Models\Hub")) {
            Permission::addModel(\App\Models\Hub::class, __('Hub'));
            Permission::addModel(\App\Models\User::class, __('User'));
            Permission::addModel(\App\Models\Role::class, __('Role'));
        }
        if (class_exists("\App\Models\Credential")) {
            Permission::addModel(\App\Models\Credential::class, __('Credential'));
        }
        if (class_exists("\App\Models\LearningBundleRole")) {
            Permission::addModel(\App\Models\LearningBundleRole::class, __('Learning Bundle Role'), [
                'group' => \App\Models\LearningBundle::class,
                'hidden' => true,
            ]);
        }
        if (class_exists("\App\Models\LearningBundle")) {            
            Permission::addModel(\App\Models\LearningBundle::class, __('Learning Bundle'));
            Permission::addModel(\App\Models\LearningCourse::class, __('Learning Course'));
            Permission::addModel(\App\Models\LearningModule::class, __('Learning Module'), [
                'group' => \App\Models\LearningCourse::class,
                'hidden' => true,
            ]);
            Permission::addModel(\App\Models\LearningSection::class, __('Learning Section'), [
                'group' => \App\Models\LearningCourse::class,
                'hidden' => true,
            ]);
            Permission::addModel(\App\Models\LearningLection::class, __('Learning Lection'), [
                'group' => \App\Models\LearningCourse::class,
                'hidden' => true,
            ]);    
        }
        
        
        Gate::guessPolicyNamesUsing(function (string $modelClass) {
            $policyClass = 'App\\Policies\\'.class_basename($modelClass).'Policy';
            if (class_exists($policyClass)) {
                return $policyClass;
            }

            if (is_a($modelClass, Model::class, true) && is_a($modelClass, \App\Models\Base::class, true)) {
                return \AHerzog\Hubjutsu\Policies\PermissionPolicy::class;
            }

            return null;
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

        if (!$this->app->bound(PackageIntegrationServiceRegistry::class)) {
            $this->app->singleton(
                PackageIntegrationServiceRegistry::class,
                fn () => new PackageIntegrationServiceRegistry()
            );
        }

        if (class_exists(\App\Services\Integrations\IntegrationServiceRegistry::class)
            && !$this->app->bound(\App\Services\Integrations\IntegrationServiceRegistry::class)) {
            $this->app->singleton(
                \App\Services\Integrations\IntegrationServiceRegistry::class,
                fn ($app) => $app->make(PackageIntegrationServiceRegistry::class)
            );
        }

        $this->app->afterResolving(PackageIntegrationServiceRegistry::class, function ($registry) {
            if (!method_exists($registry, 'register')) {
                return;
            }

            if (class_exists(\App\Services\Integrations\MetaAdsOAuthService::class)) {
                $registry->register(\App\Services\Integrations\MetaAdsOAuthService::class);
            }
            if (class_exists(\App\Services\Integrations\MetaLoginOAuthService::class)) {
                $registry->register(\App\Services\Integrations\MetaLoginOAuthService::class);
            }
            if (class_exists(\App\Services\Integrations\GoogleOAuthService::class)) {
                $registry->register(\App\Services\Integrations\GoogleOAuthService::class);
            }
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
