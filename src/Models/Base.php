<?php


namespace AHerzog\Hubjutsu\Models;

use Cache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
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


}
