<?php


namespace AHerzog\Hubjutsu\App\Auth;

use AHerzog\Hubjutsu\Models\UserHubRole;
use App\Models\Hub;
use App\Models\User;

class Permission {
    private static $groups = [];
    private static $permissions = [];

    private function __construct() {
    }

    public static function addModel($model, $name=null) {
        if (is_object($model)) {
            $model = get_class($model);
        }

        $name = $name ?: class_basename($model);
        self::addGroup($model, $name);
        self::addPermission($model, 'viewAny', "View any $name");
        self::addPermission($model, 'view', "View $name");
        self::addPermission($model, 'create', "Create $name");
        self::addPermission($model, 'update', "Update $name");
        self::addPermission($model, 'delete', "Delete $name");
        self::addPermission($model, 'restore', "Restore $name");
        self::addPermission($model, 'forceDelete', "Force delete $name");
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

    public static function getPermissionTable() {
        $return = [];
        foreach(self::$groups as $group => $name) {
            $grp = [
                'name' => $name,
                'group' => $group,
                'permissions' => []
            ];
            $permissions = self::$permissions[$group] ?? [];

            foreach($permissions as $permission => $description) {
                $grp['permissions'][] = [
                    "$group::$permission",
                    $description
                ];
            }

            $return[] = $grp;
        }
        return  $return;
    }

    static function getPermissionForUserAndHub(User $user, Hub $hub) {
        $permissions = [];
        UserHubRole::with('role.permissions')->where('user_id', $user->id)->where('hub_id', $hub->id)->get()->each(function($userHubRole) use (&$permissions) {
            $userHubRole->role->permissions->each(function($permission) use (&$permissions) {
                $permissions[$permission->name] = true;
            });
        });

        return $permissions;
    }

    static function exists($group, $permission): bool {
        return isset(self::$permissions[$group][$permission]);
    }
}