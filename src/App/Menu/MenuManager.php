<?php


namespace AHerzog\Hubjutsu\App\Menu;

use Event;
use Str;

class MenuManager {

    
    const POSITION_SIDEBAR = 'sidebar';

    /** @var Menu[] */
    public array $menus = [];

    public function __construct()
    {
        
    }

    /**
     * @param string $menuName
     * @return Menu
     */
    public function addMenu($menuName, $slug = ''): Menu
    {
        if ($menuName instanceof Menu) {
            $this->menus[$menuName->slug] = $menuName;
            return $menuName;
        }

        if (!$slug) {
            $slug = Str::slug($menuName);
        }
        $this->menus[$slug] = new Menu($menuName, $slug);
        return $this->menus[$slug];
    }

    public function getMenuByName($menuName): ?Menu
    {
        foreach($this->menus as $menu) {
            if ($menu->name === $menuName) {
                return $menu;
            }
        }
        return null;
    }

    public function getMenuBySlug($slug): ?Menu
    {
        return $this->menus[$slug] ?? null;
    }


    public function getMenus(): array
    {
        return $this->menus;
    }

}
