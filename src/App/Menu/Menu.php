<?php


namespace AHerzog\Hubjutsu\App\Menu;

use Peast\Syntax\Position;

class Menu {

    public function __construct(
        public string $name,
        public string $slug,
        public array $items = [],
        public string $position=MenuManager::POSITION_SIDEBAR,
    ) {

    }


    /**
     * 
     * @param MenuItem|string $title 
     * @param object|array|string|null $route 
     * @return MenuItem 
     */
    public function addItem(MenuItem|string $title, $route=null): MenuItem
    {
        if ($title instanceof MenuItem) {
            $this->items[] = $title;
            return $title;
        }
        $this->items[] = $newItem = new MenuItem(
            $title,
            $route
        );
        
        return $newItem;
    }


}
