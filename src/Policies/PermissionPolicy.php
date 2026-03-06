<?php



namespace AHerzog\Hubjutsu\Policies;

use AHerzog\Hubjutsu\App\Auth\Permission;
use AHerzog\Hubjutsu\Models\Traits\UserTrait;
use App\Services\HubManager;
use App\Models\Base;
use App\Models\Hub;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;

class PermissionPolicy {


    function __call($name, $arguments) {
        return $this->checkPermission($arguments[0], app()->get(HubManager::class)->current(), $arguments[1], $name);
    }

    /**
     * Determine whether the user can view any models.
     */
    protected function checkPermission(User $user, Hub $hub, Base|string $model, string $action): bool|null
    {
        $modelClass = is_string($model) ? $model : $model::class;
        $permissionGroup = Permission::resolveGroup($modelClass);
        $permissionAction = $this->normalizeAbilityToPermissionAction($action);

        if ($this->hasPermission($user, $hub, 'admin::admin')) {
            return true;
        }

        if (in_array($action, ['restore', 'forceDelete'], true)
            && !in_array(SoftDeletes::class, class_uses_recursive($modelClass), true)) {
            return null;
        }

        $permissionExists = Permission::exists($permissionGroup, $permissionAction)
            || Permission::exists($permissionGroup, $action);

        if (!$permissionExists) {
            return null;
        }

        $permissionKeys = $this->candidatePermissionKeys($modelClass, $permissionGroup, $action, $permissionAction);
        if ($this->hasAnyPermission($user, $hub, $permissionKeys)) {
            return true;
        }

        // Wenn ein Modell user()-Ownership besitzt, darf create auch das Update eigener Datensätze erlauben.
        if ($action === 'update' && $model instanceof Base && in_array(UserTrait::class, class_uses_recursive($modelClass), true)) {
            $createPermissions = array_values(array_unique([
                Permission::buildPermission($permissionGroup, 'create'),
                $modelClass.'::create',
            ]));

            if ($this->isOwnedByUser($model, $user)
                && $this->hasAnyPermission($user, $hub, $createPermissions)) {
                return true;
            }

            $ownPermissions = array_values(array_unique([
                Permission::buildPermission($permissionGroup, 'editOwn'),
                Permission::buildPermission($permissionGroup, 'updateOwn'),
                $modelClass.'::editOwn',
                $modelClass.'::updateOwn',
            ]));

            if ((Permission::exists($permissionGroup, 'editOwn') || Permission::exists($permissionGroup, 'updateOwn'))
                && $this->isOwnedByUser($model, $user)
                && $this->hasAnyPermission($user, $hub, $ownPermissions)) {
                return true;
            }
        }

        return false;
    }

    protected function hasPermission(User $user, Hub $hub, string $permission): bool
    {
        return RolePermission::wherePermission($permission)
            ->whereHas('role.roleAssignments', function ($query) use ($user, $hub) {
                $query->where('user_id', $user->id)
                    ->where('scope_type', $hub->getMorphClass())
                    ->where('scope_id', $hub->getKey());
            })
            ->exists();
    }

    protected function hasAnyPermission(User $user, Hub $hub, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($user, $hub, $permission)) {
                return true;
            }
        }

        return false;
    }

    protected function candidatePermissionKeys(string $modelClass, string $permissionGroup, string $abilityAction, string $permissionAction): array
    {
        return array_values(array_unique(array_filter([
            Permission::buildPermission($permissionGroup, $permissionAction),
            $permissionAction !== $abilityAction ? Permission::buildPermission($permissionGroup, $abilityAction) : null,
            $modelClass.'::'.$abilityAction,
        ])));
    }

    protected function normalizeAbilityToPermissionAction(string $action): string
    {
        if ($action === 'update') {
            return 'edit';
        }

        return $action;
    }

    protected function isOwnedByUser(Base $model, User $user): bool
    {
        $createdBy = $model->getAttribute('created_by');
        if ($createdBy !== null) {
            return intval($createdBy) === intval($user->id);
        }

        $userId = $model->getAttribute('user_id');
        if ($userId !== null) {
            return intval($userId) === intval($user->id);
        }

        return false;
    }
    
}
