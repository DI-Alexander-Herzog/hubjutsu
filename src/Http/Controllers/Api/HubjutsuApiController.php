<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\Models\Base;
use Exception;
use Gate;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\Request;
use Log;
use Str;

class HubjutsuApiController
{
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

        $queryBuilder = $modelObj->newModelQuery();

        foreach($request->get('multiSortMeta', []) as $sort) {
            $queryBuilder->orderBy($sort[0], $sort[1] > 0 ? 'asc' : 'desc');
        };
        
        foreach($request->get('filters', []) as $filter) {
            if (!isset($filter['value'])) continue;
            
            $modelObj->searchInApi($queryBuilder, $filter['field'], $filter['value'], $filter['matchMode'] ?? null);
        };

        foreach($request->get('with', []) as $with) {
            $queryBuilder->with($with);
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

    public function get(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'view');
        if ($modelObj instanceof Base) {        
            return response()->json($modelObj->prepareForApi($request));
        }
        return response()->json($modelObj->toArray());
    }

    public function create(Request $request, string $model)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'create');
        $modelObj->fill($request->only($modelObj->getFillable()));
        $modelObj->save();
        if (method_exists($modelObj, 'fillMedia')) {
            $modelObj->fillMedia($request->all());
        }
        return response()->json($modelObj->prepareForApi($request)->toArray());
    }

    public function update(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, $id, 'update');
        $modelObj->fill($request->only($modelObj->getFillable()));
        
        if (method_exists($modelObj, 'fillMedia')) {
            $modelObj->fillMedia($request->all());
        }
        $modelObj->save();
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