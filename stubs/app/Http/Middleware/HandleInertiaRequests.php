<?php

namespace App\Http\Middleware;

use AHerzog\Hubjutsu\App\Menu\MenuManager;
class HandleInertiaRequests extends \AHerzog\Hubjutsu\Http\Middleware\HandleInertiaRequests
{
    
    public function generateMenus(MenuManager $menuManager)
    {
        $menu = $menuManager->addMenu('Main Menu');
        $dashboard = $menu->addItem('Dashboard');
        $dashboard->setRoute('dashboard');
    }
    
}
