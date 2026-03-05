<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use App\Models\RoleAssignment;
use AHerzog\Hubjutsu\Models\Traits\HasRoleAssignments;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RoleAssignmentController extends HubjutsuApiController
{
    public function stack(Request $request)
    {
        $data = $request->validate([
            'scope_type' => ['required', 'string'],
            'scope_id' => ['required', 'integer'],
        ]);

        $scope = $this->resolveScope($data['scope_type'], $data['scope_id']);

        $ancestors = $this->resolveAncestors($scope);

        $ancestorAssignments = collect($ancestors)->map(function (Model $ancestor) {
            $assignments = RoleAssignment::with(['role', 'user'])
                ->where('scope_type', $ancestor->getMorphClass())
                ->where('scope_id', $ancestor->getKey())
                ->get()
                ->map(fn (RoleAssignment $assignment) => $this->assignmentPayload($assignment));

            return [
                'id' => $ancestor->getKey(),
                'type' => $ancestor->getMorphClass(),
                'type_label' => class_basename($ancestor),
                'label' => $this->labelFor($ancestor),
                'assignments' => $assignments,
            ];
        })->filter(fn ($entry) => $entry['assignments']->isNotEmpty())->values();

        $directCount = RoleAssignment::where('scope_type', $scope->getMorphClass())
            ->where('scope_id', $scope->getKey())
            ->count();

        return response()->json([
            'scope' => [
                'id' => $scope->getKey(),
                'type' => $scope->getMorphClass(),
                'type_label' => class_basename($scope),
                'label' => $this->labelFor($scope),
            ],
            'direct_count' => $directCount,
            'ancestors' => $ancestorAssignments,
        ]);
    }

    protected function resolveScope(string $scopeType, int $scopeId): Model
    {
        if (!class_exists($scopeType)) {
            abort(404, 'Scope type not found');
        }

        /** @var Model $model */
        $model = app($scopeType)->newQuery()->findOrFail($scopeId);

        if (!in_array(HasRoleAssignments::class, class_uses_recursive($model))) {
            abort(400, 'Scope is not role assignable');
        }

        return $model;
    }

    protected function resolveAncestors(Model $model): array
    {
        if (!method_exists($model, 'roleAssignmentAncestors')) {
            return [];
        }

        $ancestors = [];
        foreach ($model::roleAssignmentAncestors() as $path) {
            $segments = array_values(array_filter(explode('.', $path)));
            $resolved = $this->expandPathNodes([$model], $segments);
            foreach ($resolved as $ancestor) {
                if (!$ancestor instanceof Model) {
                    continue;
                }
                $key = $ancestor::class . ':' . $ancestor->getKey();
                $ancestors[$key] = $ancestor;
            }
        }

        return array_values($ancestors);
    }

    /**
     * @param array<int, Model> $nodes
     * @param array<int, string> $segments
     * @return array<int, Model>
     */
    protected function expandPathNodes(array $nodes, array $segments): array
    {
        if (empty($segments)) {
            return array_values(array_filter($nodes, fn ($node) => $node instanceof Model));
        }

        $segment = array_shift($segments);
        $nextNodes = [];

        foreach ($nodes as $node) {
            if (!($node instanceof Model) || !method_exists($node, $segment)) {
                continue;
            }

            $related = $node->{$segment};
            if ($related instanceof Model) {
                $nextNodes[] = $related;
                continue;
            }

            if ($related instanceof Collection) {
                foreach ($related as $item) {
                    if ($item instanceof Model) {
                        $nextNodes[] = $item;
                    }
                }
            }
        }

        if (empty($nextNodes)) {
            return [];
        }

        return $this->expandPathNodes($nextNodes, $segments);
    }

    protected function labelFor(Model $model): string
    {
        foreach (['name', 'title', 'label', 'slug'] as $attribute) {
            if (!empty($model->{$attribute})) {
                return (string) $model->{$attribute};
            }
        }

        return class_basename($model) . ' #' . $model->getKey();
    }

    protected function assignmentPayload(RoleAssignment $assignment): array
    {
        $user = $assignment->user;
        $role = $assignment->role;

        return [
            'id' => $assignment->id,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'role' => $role ? [
                'id' => $role->id,
                'name' => $role->name,
            ] : null,
        ];
    }
}
