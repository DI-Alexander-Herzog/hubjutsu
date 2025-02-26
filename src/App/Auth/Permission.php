<?php


namespace AHerzog\Hubjutsu\App\Auth;

class Permission {
    private static $groups = [];
    private static $permissions = [];

    private function __construct() {
    }

    public static function addGroup(string $group, $name=""): void {
        $group = $group ?: 'default';
        if (!array_key_exists($group, self::$groups)) {
            self::$groups[$group] = $name ?: $group;
        }
    }

    public static function addPermission(string $group, string $permission, $description = "", ): void {
        self::addGroup($group);
        self::$permissions[$group][$permission] = $description ?: $permission;
    }

    public static function getGrouped() {
        foreach(self::$groups as $group => $name) {
            $permissions = self::$permissions[$group] ?? [];
            yield $name => $permissions;
        }
    }
}