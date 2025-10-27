<?php

namespace App\Http\Middleware;

use AHerzog\Hubjutsu\App\Menu\MenuManager;
use Illuminate\Http\Request;

class HandleInertiaRequests extends \AHerzog\Hubjutsu\Http\Middleware\HandleInertiaRequests
{
    
    public function generateMenus(MenuManager $menuManager, Request $request)
    {
        $menu = $menuManager->addMenu('Main Menu');
        $dashboard = $menu->addItem('Dashboard');
        $dashboard->setRoute('dashboard');
    }
    
}
