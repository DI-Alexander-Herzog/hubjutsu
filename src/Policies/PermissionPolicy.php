<?php



namespace AHerzog\Hubjutsu\Policies;

use AHerzog\Hubjutsu\App\Auth\Permission;
use App\Services\HubManager;
use App\Models\Base;
use App\Models\Hub;
use App\Models\RolePermission;
use App\Models\User;

class PermissionPolicy {


    function __call($name, $arguments) {
        return $this->checkPermission($arguments[0], app()->get(HubManager::class)->current(), $arguments[1], $name);
    }

    /**
     * Determine whether the user can view any models.
     */
    protected function checkPermission(User $user, Hub $hub, Base|string $model, string $action): bool|null
    {
        $modelClass = is_string($model) ? $model : get_class($model);

        if (!Permission::exists($modelClass, $action)) {
            return null;
        }

        return RolePermission::wherePermission($modelClass.'::'.$action)
            ->whereHas('role.roleAssignments', function ($query) use ($user, $hub) {
                $query->where('user_id', $user->id)
                    ->where('scope_type', $hub->getMorphClass())
                    ->where('scope_id', $hub->getKey());
            })
            ->exists();
    }
    
}
