<?php

namespace AHerzog\Hubjutsu\Http\Middleware;

use AHerzog\Hubjutsu\App\Menu\MenuManager;
use App\Models\Hub;
use App\Services\HubManager;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],

            'hub' => function() {
                try {
                    return app()->get(HubManager::class)->current()->uiData();
                    
                } catch (\Exception $e) {
                    return [
                        'id' => 0,
                        'name' => $e->getMessage(),
                        'slug' => 'error',
                        'url' => config('app.url'),
                        'has_darkmode' => false,
                        'enable_registration' => false,
                        'enable_guestmode' => false,
                        'cssVars' => [],
                        'colors' => [
                            'primary' => '#000',
                            'primary_text' => '#fff',
                            'secondary' => '#000',
                            'secondary_text' => '#fff',
                            'tertiary' => '#000',
                            'tertiary_text' => '#fff',
                            'text' => '#000',
                            'background' => '#fff',
                        ],
                        'fonts' => [
                            'size' => 1,
                            'sans' => 'sans-serif',
                            'serif' => 'serif',
                            'mono' => 'monospace',
                            'header' => 'sans-serif',
                            'text' => 'sans-serif',
                            'import' => '',
                        ]
                    ];
                }
                
            },  
            'menus' => function() use ( $request ) {
                /** @var MenuManager $menuManager */
                $menuManager = app(MenuManager::class);
                $this->generateMenus($menuManager, $request);
                $menuManager->checkActiveURL($request->url());
                return $menuManager->getMenus();
            }
        ];
    }

    public function generateMenus(MenuManager $menuManager, Request $request)
    {
        $menu = $menuManager->addMenu('Main Menu');
        $dashboard = $menu->addItem('Dashboard');
        $dashboard->setRoute('dashboard');
    }
}
