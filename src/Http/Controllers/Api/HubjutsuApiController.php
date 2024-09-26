<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\Models\Base;
use Auth;
use Gate;
use Request;
use Str;

class HubjutsuApiController
{

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
            return response()->json([
                'message' => 'Not allowed',
            ], 403);
        }
        return $obj;
    }

    public function search(Request $request, string $model)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'viewAny');
        
        return response()->json($modelObj->whereRaw('1=1')->paginate());
    }

    public function get(Request $request, string $model, $id)
    {
        $modelObj = $this->getModelIfAllowed($model, null, 'view');
        
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
        return response()->json([
            'message' => 'Hello World!',
        ]);
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