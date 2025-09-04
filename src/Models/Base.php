<?php


namespace AHerzog\Hubjutsu\Models;

use Cache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class Base extends Model {    

    // doesn't do anything, only used for laoding extra data
    /**
     * @param Request $request 
     * @return $this 
     */
    public function prepareForApi(Request $request)
    {
        $with = $request->get('with', []);
        foreach($with as $relation) {
            if (method_exists($this, $relation)) {
                $this->loadMissing($relation);
            }
        }
        return $this;
    }

    public function searchInApi(Builder $builder, string $field, $value, string $matchMode = 'contains') {
        return false;
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