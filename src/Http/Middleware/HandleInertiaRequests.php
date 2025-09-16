<?php

namespace AHerzog\Hubjutsu\Http\Middleware;

use AHerzog\Hubjutsu\App\Menu\MenuManager;
use App\Models\Hub;
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
                return Hub::first()->uiData();
            },  
            'menus' => function() use ( $request ) {
                $menuMenager = app('menuManager');
                $this->generateMenus($menuMenager, $request);
                return $menuMenager->getMenus();
            }
        ];
    }

    public function generateMenus(MenuManager $menuManager)
    {
        $menu = $menuManager->addMenu('Main Menu');
        $dashboard = $menu->addItem('Dashboard');
        $dashboard->setRoute('dashboard');
    }
}
