<?php



namespace AHerzog\Hubjutsu\Policies;

use App\Models\Base;
use App\Models\User;

class PermissionPolicy {

    protected $authViaRelation = false;

    /**
     * Determine whether the user can view any models.
     */
    protected function checkPermission(User $user, Base $model, string $action): bool
    {
        $modelClass = get_class($model);
        
        return true;
        
    }

}