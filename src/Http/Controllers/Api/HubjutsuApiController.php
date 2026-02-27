<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\Models\Base;
use Exception;
use Gate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\Request;
use Log;
use Str;
use Throwable;

class HubjutsuApiController
{
    /**
     * Projekt-Hook für globale Suche.
     *
     * Rückgabeformat pro Eintrag:
     * [
     *   'model' => 'learning_course',
     *   'label' => 'Kurse',
     *   'title_field' => 'name',          // optional, default: name
     *   'subtitle_field' => 'description',// optional
     *   'route' => 'settings.learningcourses.edit', // optional
     *   'route_param' => null,            // optional, default: model binding via row
     *   'limit' => 5,                     // optional, default: 5
     *   'with' => [],                     // optional
     *   'init' => '',                     // optional
     * ]
     */
    protected function registerGlobalModels(Request $request): array
    {
        return [];
    }

    /**
     * 
     * @param string $model 
     * @param mixed $id 
     * @param string $gate 
     * @return Base
     * @throws Exception 
     * @throws BindingResolutionException 
     */
    protected function getModelIfAllowed(string $model, $id, string $gate)
    {
        
        $class = 'App\\Models\\' . Str::studly($model);
        if (!class_exists($class)) {
            throw new \Exception('Model not found');
        }

        $obj = new $class();
        if (!($obj instanceof Base)) {
            throw new \Exception('Model not api compatible');
        }
        if ($id) {
            $obj = $obj->findOrFail($id);
        }
        if (!Gate::allows($gate, ($id ? $obj : $obj::class)) ) {
            throw new \Exception('Not allowed');
        }
        return $obj;
    }

    public function search(Request $request, string $model)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'viewAny');
        
        $search = $request->get('search');

        $paginatePerPage = intval($request->get('rows'));
        $offset = intval($request->get('first'));
        $page =  floor($offset / $paginatePerPage) + 1;

        $init = trim((string) $request->get('init', ''));
        $initQueryMethod = 'initQuery';
        if ($init !== '') {
            $customInitQueryMethod = 'initQuery' . Str::studly($init);
            if (method_exists($modelObj, $customInitQueryMethod)) {
                $initQueryMethod = $customInitQueryMethod;
            }
        }

        $queryBuilder = $modelObj->{$initQueryMethod}();
        if (!($queryBuilder instanceof Builder)) {
            throw new \Exception('Invalid init query builder');
        }

        foreach($request->get('multiSortMeta', []) as $sort) {
            $queryBuilder->orderBy($sort[0], $sort[1] > 0 ? 'asc' : 'desc');
        };
        
        
        $queryBuilder->where(function($q) use ($request, $modelObj) {
            foreach($request->get('filters', []) as $filter) {
                if (!isset($filter['value'])) continue;
                
                $modelObj->searchInApi($q, $filter['field'], $filter['value'], $filter['matchMode'] ?? null);
            };
        });
        

        foreach($request->get('with', []) as $with) {
            $queryBuilder->with($with);
        };

        if(($includeIds = $request->get('include', []) )) {
            $queryBuilder->orWhere($modelObj->getKeyName(), 'in', $includeIds);
        };


        if ($search) {
            $queryBuilder->search($search);
        }
        
        $result = $queryBuilder->paginate($paginatePerPage, ['*'], 'page', $page);
        foreach($result->items() as $item) {
            if ($item instanceof Base) {
                $item->prepareForApi($request);
            }
        }

        return response()->json($result);
    }

    public function globalSearch(Request $request)
    {
        $term = trim((string) $request->get('q', ''));
        if ($term === '') {
            return response()->json(['results' => []]);
        }

        $groups = [];
        foreach ($this->registerGlobalModels($request) as $cfg) {
            $model = (string) ($cfg['model'] ?? '');
            if ($model === '') {
                continue;
            }

            $titleField = (string) ($cfg['title_field'] ?? 'name');
            $subtitleField = (string) ($cfg['subtitle_field'] ?? '');
            $groupLabel = (string) ($cfg['label'] ?? Str::headline($model));
            $limit = max(1, (int) ($cfg['limit'] ?? 5));
            $with = is_array($cfg['with'] ?? null) ? $cfg['with'] : [];
            $init = trim((string) ($cfg['init'] ?? ''));
            $routeName = (string) ($cfg['route'] ?? '');
            $routeParam = $cfg['route_param'] ?? null;

            try {
                $modelObj = $this->getModelIfAllowed($model, null, 'viewAny');

                $initQueryMethod = 'initQuery';
                if ($init !== '') {
                    $customInitQueryMethod = 'initQuery' . Str::studly($init);
                    if (method_exists($modelObj, $customInitQueryMethod)) {
                        $initQueryMethod = $customInitQueryMethod;
                    }
                }

                $queryBuilder = $modelObj->{$initQueryMethod}();
                if (!($queryBuilder instanceof Builder)) {
                    continue;
                }

                foreach ($with as $relation) {
                    $queryBuilder->with($relation);
                }

                $rows = $queryBuilder
                    ->search($term)
                    ->limit($limit)
                    ->get();

                $items = [];
                foreach ($rows as $row) {
                    $url = null;
                    if ($routeName !== '') {
                        try {
                            $url = $routeParam !== null
                                ? route($routeName, [$routeParam => $row->getKey()])
                                : route($routeName, $row);
                        } catch (Throwable $e) {
                            $url = null;
                        }
                    }

                    $items[] = [
                        'id' => $row->getKey(),
                        'model' => $model,
                        'group' => $groupLabel,
                        'title' => (string) ($row->{$titleField} ?? ('#' . $row->getKey())),
                        'subtitle' => $subtitleField !== '' ? (string) ($row->{$subtitleField} ?? '') : '',
                        'url' => $url,
                    ];
                }

                if (count($items) > 0) {
                    $groups[] = [
                        'model' => $model,
                        'label' => $groupLabel,
                        'items' => $items,
                    ];
                }
            } catch (Throwable $e) {
                // Einzelne Modellfehler sollen globale Suche nicht komplett stoppen.
                continue;
            }
        }

        return response()->json(['results' => $groups]);
    }

    public function get(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, $id, 'view');
        if ($modelObj instanceof Base) {        
            return response()->json($modelObj->prepareForApi($request));
        }
        return response()->json($modelObj->toArray());
    }

    public function create(Request $request, string $model)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'create');
        $rules = method_exists($modelObj, 'getRules') ? $modelObj::getRules() : [];
        $payload = $rules ? $request->validate($rules) : $request->only($modelObj->getFillable());
        if ($rules) {
            $payload = array_intersect_key($payload, array_flip($modelObj->getFillable()));
        }
        $modelObj->fill($payload);
        $modelObj->save();
        if (method_exists($modelObj, 'fillMedia')) {
            $modelObj->fillMedia($request->all());
        }
        if (method_exists($modelObj, 'postApiSave')) {
            $modelObj->postApiSave($request);
        }
        $modelObj->refresh();
        return response()->json($modelObj->prepareForApi($request)->toArray());
    }

    public function update(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, $id, 'update');
        $rules = method_exists($modelObj, 'getRules') ? $modelObj::getRules() : [];
        $payload = $rules ? $request->validate($rules) : $request->only($modelObj->getFillable());
        if ($rules) {
            $payload = array_intersect_key($payload, array_flip($modelObj->getFillable()));
        }
        $modelObj->fill($payload);
        
        if (method_exists($modelObj, 'fillMedia')) {
            $modelObj->fillMedia($request->all());
        }
        $modelObj->save();
        if (method_exists($modelObj, 'postApiSave')) {
            $modelObj->postApiSave($request);
        }
        $modelObj->refresh();
        return response()->json($modelObj->prepareForApi($request)->toArray());
    }


    public function delete(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, $id, 'delete');
        $return = $modelObj->prepareForApi($request)->toArray();
        $modelObj->delete();
        return response()->json($return);
    }

    public function restore(Request $request, string $model, $id)
    {
        return response()->json([
            'message' => 'Hello World!',
        ]);
    }

    public function forceDelete(Request $request, string $model, $id)
    {
        return response()->json([
            'message' => 'Hello World!',
        ]);
    }



}
