<?php


namespace AHerzog\Hubjutsu\Models;

use Cache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use phpDocumentor\Reflection\DocBlock\Tags\Var_;

class Base extends Model {    

    public static function getRules(): array
    {
        return [];
    }

    public function postApiSave(Request $request): void
    {
        // Hook for API create/update operations.
    }

    // doesn't do anything, only used for laoding extra data
    /**
     * @param Request $request 
     * @return $this 
     */
    public function prepareForApi(Request $request)
    {
        $with = $request->get('with', []);
        foreach($with as $relation) {
            $submodel = explode('.', $relation)[0];
            if (method_exists($this, $submodel)) {
                $this->loadMissing($relation);
            }
        }
        $withCount = $request->get('withCount', []);
        foreach($withCount as $count) {
            $this->withCount($count);
        }
        return $this;
    }

    public function searchInApi(Builder $builder, string $field, $value, string $matchMode = 'contains') {
        if ($value === null) return;

        $matchMode = strtoupper($matchMode);
        if ($matchMode == "NOT IN") {
            $builder->whereNotIn($field, $value);
        } elseif ($matchMode == "IN") {
            $builder->whereIn($field, $value);
        } elseif ($matchMode == "BETWEEN") {
            if (is_array($value) && count($value) >= 2) {
                $builder->whereBetween($field, [$value[0], $value[1]]);
            }
        } elseif ($matchMode == "CONTAINS") {
            $builder->where($field, 'LIKE' , '%' . $value . '%');
        } else {
            $builder->where($field, $matchMode, $value);
        }
    }

    protected function getSearchableFields() {
        return Cache::remember(get_class($this).'::searchable_fields', 60, function() {
            $reflection = new \ReflectionClass($this);
            $docComment = $reflection->getDocComment();

            preg_match_all('/@property\s+string([^\s]*)\s+\$([^\s]+)/', $docComment, $matches, PREG_PATTERN_ORDER);
            return $matches[2] ?: [];
        });
    }

    public function scopeSearch(Builder $query, $term)
    {
        if ($term) {
            $likeTerm = '%' . str_replace('%', '\\%', $term) . '%';
            $query->where(function($q) use ($likeTerm) {
                foreach($this->getSearchableFields() as $field) {
                    $q->orWhere($field, 'like', $likeTerm);
                }
            });
        }
        return $query;
    }

    /**
     * Optional API sort mapping.
     *
     * Example:
     * [
     *   'producttype_id' => 'producttype.label',
     *   'name' => 'name',
     * ]
     *
     * Keys are requested sort fields, values are either direct DB columns
     * or belongsTo relation paths ending in a sortable column.
     *
     * @return array<string, string>
     */
    protected function apiSortColumns(): array
    {
        return [];
    }

    public function resolveApiSortField(Builder $query, string $field): string
    {
        $map = $this->apiSortColumns();
        $mapped = $map[$field] ?? $field;

        if (!is_string($mapped) || trim($mapped) === '') {
            return $field;
        }

        if (!str_contains($mapped, '.')) {
            return $mapped;
        }

        $alias = $this->addApiSortRelationSelect($query, $mapped);
        return $alias ?? $field;
    }

    private function addApiSortRelationSelect(Builder $query, string $relationPath): ?string
    {
        $parts = array_values(array_filter(explode('.', $relationPath), fn ($part) => $part !== ''));
        if (count($parts) < 2) {
            return null;
        }

        $sortColumn = array_pop($parts);
        if (!$sortColumn) {
            return null;
        }

        $chain = [];
        $currentModel = $this;

        foreach ($parts as $index => $relationName) {
            if (!method_exists($currentModel, $relationName)) {
                return null;
            }

            $relation = $currentModel->{$relationName}();
            if (!($relation instanceof BelongsTo)) {
                return null;
            }

            $chain[] = [
                'index' => $index + 1,
                'foreign_key' => $relation->getForeignKeyName(),
                'owner_key' => $relation->getOwnerKeyName(),
                'related_model' => $relation->getRelated(),
            ];

            $currentModel = $relation->getRelated();
        }

        if ($chain === []) {
            return null;
        }

        $depth = count($chain);
        $deep = $chain[$depth - 1];
        /** @var Model $deepModel */
        $deepModel = $deep['related_model'];
        $deepAlias = 'hs' . $depth;

        $sub = $deepModel->newQueryWithoutScopes()
            ->from($deepModel->getTable() . ' as ' . $deepAlias)
            ->select($deepAlias . '.' . $sortColumn);

        for ($i = $depth - 1; $i >= 1; $i--) {
            $parent = $chain[$i - 1];
            $child = $chain[$i];

            /** @var Model $parentModel */
            $parentModel = $parent['related_model'];
            $parentAlias = 'hs' . $i;
            $childAlias = 'hs' . ($i + 1);

            $sub->join(
                $parentModel->getTable() . ' as ' . $parentAlias,
                $parentAlias . '.' . $child['foreign_key'],
                '=',
                $childAlias . '.' . $child['owner_key']
            );
        }

        $rootTable = $this->getTable();
        $first = $chain[0];
        $firstAlias = 'hs1';
        $sub->whereColumn(
            $firstAlias . '.' . $first['owner_key'],
            $rootTable . '.' . $first['foreign_key']
        )->limit(1);

        $alias = '__sort_' . preg_replace('/[^a-z0-9_]+/i', '_', strtolower($relationPath));
        $query->addSelect([$alias => $sub]);

        return $alias;
    }

    /**
     * Initialize the base query for API search.
     * Models can add named variants with methods like initQueryFooBar().
     */
    public function initQuery(): Builder
    {
        return $this->newModelQuery();
    }

}
