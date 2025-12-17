<?php

namespace AHerzog\Hubjutsu\App\Auth;

use App\Models\RoleAssignment;
use App\Models\RolePermission;
use App\Models\User;
use AHerzog\Hubjutsu\Models\Traits\HasRoleAssignments;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\Builder as QueryBuilder;
use InvalidArgumentException;

class RoleAssignmentQueryBuilder
{
    private ?User $user = null;
    private ?string $permission = null;

    public function __construct(private readonly string $modelClass)
    {
    }

    public static function for(string $modelClass): self
    {
        return new self($modelClass);
    }

    public function user(User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function permission(string $permission): self
    {
        $this->permission = $permission;

        return $this;
    }

    public function apply(Builder $builder): Builder
    {
        $this->assertReady($builder);

        $paths = $this->paths();

        return $builder->where(function (Builder $scope) use ($paths) {
            foreach ($paths as $index => $segments) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $scope->{$method}(function (Builder $clause) use ($segments) {
                    $this->applyPath($clause, $segments);
                });
            }
        });
    }

    private function assertReady(Builder $builder): void
    {
        if (! $this->user || ! $this->permission) {
            throw new InvalidArgumentException('RoleAssignmentQueryBuilder requires both user and permission.');
        }

        if (! is_a($this->modelClass, Model::class, true)) {
            throw new InvalidArgumentException("{$this->modelClass} is not an Eloquent model.");
        }

        if (! in_array(HasRoleAssignments::class, class_uses_recursive($this->modelClass), true)) {
            throw new InvalidArgumentException("{$this->modelClass} must use the HasRoleAssignments trait.");
        }

        if (! $builder->getModel() instanceof $this->modelClass) {
            throw new InvalidArgumentException('The provided query does not match the configured model.');
        }
    }

    private function paths(): array
    {
        /** @var HasRoleAssignments $modelClass */
        $modelClass = $this->modelClass;
        $paths = [[]];

        foreach ($modelClass::roleAssignmentAncestors() as $path) {
            $segments = array_values(array_filter(explode('.', $path)));
            $paths[] = $segments;
        }

        return $paths;
    }

    private function applyPath(Builder $builder, array $segments): void
    {
        if (empty($segments)) {
            $this->addAssignmentConstraint($builder);

            return;
        }

        $relationName = array_shift($segments);
        $this->guardRelation($builder->getModel(), $relationName);

        $builder->whereHas($relationName, function (Builder $relationQuery) use ($segments) {
            $this->applyPath($relationQuery, $segments);
        });
    }

    private function guardRelation(Model $model, string $relationName): void
    {
        if (! method_exists($model, $relationName)) {
            throw new InvalidArgumentException("Relation {$relationName} is not defined on ".get_class($model).'.');
        }

        $relation = $model->{$relationName}();

        if (! $relation instanceof Relation) {
            throw new InvalidArgumentException("{$relationName} on ".get_class($model).' is not a valid relation.');
        }
    }

    private function addAssignmentConstraint(Builder $builder): void
    {
        $model = $builder->getModel();
        $column = $builder->qualifyColumn($model->getKeyName());
        $morphClass = $model->getMorphClass();

        $assignmentTable = (new RoleAssignment())->getTable();
        $permissionTable = (new RolePermission())->getTable();

        $permission = $this->permission;
        $userId = $this->user->id;

        $builder->whereExists(function (QueryBuilder $query) use (
            $assignmentTable,
            $permissionTable,
            $column,
            $morphClass,
            $permission,
            $userId
        ) {
            $query->selectRaw('1')
                ->from("{$assignmentTable} as ra")
                ->join("{$permissionTable} as rp", 'ra.role_id', '=', 'rp.role_id')
                ->where('rp.permission', $permission)
                ->where('ra.user_id', $userId)
                ->where('ra.scope_type', $morphClass)
                ->whereColumn('ra.scope_id', $column);
        });
    }
}
