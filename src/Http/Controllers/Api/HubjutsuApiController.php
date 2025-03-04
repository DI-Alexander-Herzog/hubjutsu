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
        if (!Gate::denies($gate, ($id ? $obj : $obj::class)) ) {
            throw new \Exception('Not allowed');
        }
        return $obj;
    }

    public function search(Request $request, string $model)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'viewAny');
        
        $paginatePerPage = intval($request->get('rows'));
        $offset = intval($request->get('first'));
        $page =  floor($offset / $paginatePerPage) + 1;

        $queryBuilder = $modelObj->newModelQuery();

        foreach($request->get('multiSortMeta', []) as $field => $order){
            $queryBuilder->orderBy($field, $order > 0 ? 'asc' : 'desc');
        };
        
        foreach($request->get('filters', []) as $filter) {
            $queryBuilder->where($filter['field'], $filter['matchMode'], $filter['value']);
        };

        foreach($request->get('with', []) as $with) {
            $queryBuilder->with($with);
        };
        
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
            $modelObj->prepareForApi($request);
        }
        return response()->json([
            'message' => 'Hello World!',
        ]);
    }

    public function create(Request $request, string $model)
    {
        return response()->json([
            'message' => 'Hello World!',
        ]);
    }

    public function update(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, $id, 'update');
        $modelObj->fill($request->only($modelObj->getFillable()));
        $modelObj->save();
        return response()->json($modelObj->prepareForApi($request)->toArray());
    }


    public function delete(Request $request, string $model, $id)
    {
        return response()->json([
            'message' => 'Hello World!',
        ]);
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