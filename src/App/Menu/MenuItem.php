<?php


namespace AHerzog\Hubjutsu\App\Menu;



class MenuItem {
    public function __construct(
        public string $title,
        public object|array|string|null $route = null,
        public bool $active = false,
        public ?string $icon = null,
        public string $target = '_self',
        protected array $children = [],
        public ?MenuItem $parent = null,
    ) {

    }


    public function setUrl(string $url): self
    {
        $this->route = $url;
        return $this;
    }
    public function setRoute(string $route, $params=[]): self
    {
        $this->route = [$route, $params];
        return $this;
    }

    public function addChild(MenuItem|string $title): MenuItem
    {
        if ($title instanceof MenuItem) {
            $this->children[] = $title;
            $title->parent = $this;
            return $title;
        }
        $this->children[] = $newItem = new MenuItem(
            title: $title,
            parent: $this
        );
        return $newItem;
    }

    public function getChildren(): array
    {
        return $this->children;
    }

}
