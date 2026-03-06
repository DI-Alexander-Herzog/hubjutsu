<?php


namespace AHerzog\Hubjutsu\App\Auth;

use App\Models\Hub;
use App\Models\RoleAssignment;
use App\Models\User;
use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use Illuminate\Database\Eloquent\SoftDeletes;

class Permission {
    private static $groups = [];
    private static $permissions = [];
    private static $groupAliases = [];
    private static $hiddenGroups = [];
    private static $modelGroups = [];

    public const ACTIONS = [
        'viewAny',
        'view',
        'create',
        'edit',
        'editOwn',
        'delete',
        'restore',
        'forceDelete',
    ];

    public const STANDARD_ACTIONS = [
        'viewAny',
        'view',
        'create',
        'edit',
        'delete',
        'restore',
        'forceDelete',
    ];

    private function __construct() {
    }

    public static function addModel($model, $name=null, array $options = []) {
        if (is_object($model)) {
            $model = get_class($model);
        }

        $group = $options['group'] ?? $model;
        self::$groupAliases[$model] = $group;
        self::$hiddenGroups[$model] = boolval($options['hidden'] ?? false);
        self::$modelGroups[$group] = true;

        $name = $name ?: class_basename($group);
        self::addGroup($group, $name);

        $availableActions = self::resolveActionsForModel($model);
        $actions = $options['actions'] ?? $availableActions;
        $actions = array_values(array_intersect(self::ACTIONS, $actions));

        foreach ($actions as $action) {
            self::addPermission(
                $group,
                $action,
                self::defaultActionDescription($action, $name)
            );
        }
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
        $rows = [];
        $customGroups = [];

        foreach(self::$groups as $group => $name) {
            if (self::isGroupHidden($group)) {
                continue;
            }

            $permissions = self::$permissions[$group] ?? [];
            $actions = [];
            $specialPermissions = [];
            $customPermissions = [];
            $isModelGroup = !empty(self::$modelGroups[$group]);

            foreach ($permissions as $action => $description) {
                $entry = [
                    'key' => self::buildPermission($group, $action),
                    'label' => $description,
                ];

                if ($isModelGroup && in_array($action, self::STANDARD_ACTIONS, true)) {
                    $actions[$action] = $entry;
                    continue;
                }

                if ($isModelGroup && in_array($action, self::ACTIONS, true)) {
                    $specialPermissions[] = $entry;
                    continue;
                }

                $customPermissions[] = $entry;
            }

            if ($isModelGroup && (!empty($actions) || !empty($specialPermissions))) {
                $rows[] = [
                    'name' => $name,
                    'group' => $group,
                    'actions' => $actions,
                    'specialPermissions' => $specialPermissions,
                ];
            }

            if (!empty($customPermissions)) {
                $customGroups[] = [
                    'name' => $name,
                    'group' => $group,
                    'permissions' => $customPermissions,
                ];
            }
        }

        usort($rows, fn ($a, $b) => strcmp((string) $a['name'], (string) $b['name']));
        usort($customGroups, function ($a, $b) {
            if (($a['group'] ?? '') === 'admin') {
                return -1;
            }
            if (($b['group'] ?? '') === 'admin') {
                return 1;
            }
            return strcmp((string) $a['name'], (string) $b['name']);
        });

        return [
            'columns' => array_map(function ($action) {
                return [
                    'key' => $action,
                    'label' => self::defaultActionTitle($action),
                ];
            }, self::STANDARD_ACTIONS),
            'rows' => $rows,
            'customGroups' => $customGroups,
        ];
    }

    static function getPermissionForUserAndHub(User $user, Hub $hub) {
        $permissions = [];
        RoleAssignment::with('role.permissions')
            ->where('user_id', $user->id)
            ->where('scope_type', $hub->getMorphClass())
            ->where('scope_id', $hub->getKey())
            ->get()
            ->each(function ($assignment) use (&$permissions) {
                $assignment->role->permissions->each(function ($permission) use (&$permissions) {
                    $permissions[$permission->permission] = true;
                });
            });

        return $permissions;
    }

    public static function resolveGroup(string $group): string
    {
        return self::$groupAliases[$group] ?? $group;
    }

    public static function buildPermission(string $group, string $permission): string
    {
        return self::resolveGroup($group).'::'.$permission;
    }

    static function exists($group, $permission): bool {
        $resolved = self::resolveGroup($group);
        return isset(self::$permissions[$resolved][$permission]);
    }

    public static function usesUserOwnership(string $modelClass): bool
    {
        return in_array(UserTrait::class, class_uses_recursive($modelClass), true);
    }

    private static function isGroupHidden(string $group): bool
    {
        return !empty(self::$hiddenGroups[$group]);
    }

    private static function resolveActionsForModel(string $model): array
    {
        $actions = ['viewAny', 'view', 'create', 'edit', 'delete'];

        if (self::usesUserOwnership($model)) {
            $actions[] = 'editOwn';
        }

        if (in_array(SoftDeletes::class, class_uses_recursive($model), true)) {
            $actions[] = 'restore';
            $actions[] = 'forceDelete';
        }

        return $actions;
    }

    private static function defaultActionTitle(string $action): string
    {
        return __("permission.action.{$action}");
    }

    private static function defaultActionDescription(string $action, string $modelName): string
    {
        return __("permission.action.{$action}_model", ['model' => $modelName]);
    }
}
