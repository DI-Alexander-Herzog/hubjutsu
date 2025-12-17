<?php

namespace AHerzog\Hubjutsu\Models\Traits;

use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use AHerzog\Hubjutsu\App\Auth\RoleAssignmentQueryBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait HasRoleAssignments
{
    public function roleAssignments(): MorphMany
    {
        return $this->morphMany(RoleAssignment::class, 'scope');
    }

    public function assignRole(User $user, Role|string $role): RoleAssignment
    {
        $roleModel = $role instanceof Role
            ? $role
            : Role::where('name', $role)->firstOrFail();

        return $this->roleAssignments()->updateOrCreate(
            [
                'user_id' => $user->id,
                'role_id' => $roleModel->id,
            ]
        );
    }

    public function scopeAccessible(Builder $query, User $user, string $permission): Builder
    {
        return RoleAssignmentQueryBuilder::for(($query->getModel())::class)
            ->user($user)
            ->permission($permission)
            ->apply($query);
    }

    public static function roleAssignmentAncestors(): array
    {
        return property_exists(static::class, 'roleAssignmentAncestors')
            ? static::$roleAssignmentAncestors
            : [];
    }
}
