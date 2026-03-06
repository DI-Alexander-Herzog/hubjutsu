<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Api;

use AHerzog\Hubjutsu\Models\Base;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Gate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Log;
use Str;
use Illuminate\Database\Eloquent\SoftDeletes;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
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

    protected function runApi(Request $request, callable $callback, array $context = []): mixed
    {
        try {
            return $callback();
        } catch (Throwable $e) {
            return $this->renderApiException($e, $request, $context);
        }
    }

    protected function renderApiException(Throwable $e, Request $request, array $context = []): JsonResponse
    {
        $status = $this->resolveStatusCode($e);
        $errorId = (string) Str::uuid();
        $message = $this->normalizeExceptionMessage($e);

        Log::error('Hubjutsu API exception', [
            'error_id' => $errorId,
            'status' => $status,
            'message' => $message,
            'exception' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'context' => $context,
        ]);

        $payload = [
            'message' => $message,
        ];

        if ($e instanceof ValidationException) {
            $payload['errors'] = $e->errors();
        }

        return response()->json($payload, $status);
    }

    protected function resolveStatusCode(Throwable $e): int
    {
        if ($e instanceof HttpExceptionInterface) {
            return $e->getStatusCode();
        }

        if ($e instanceof ValidationException) {
            return 422;
        }

        if ($e instanceof ModelNotFoundException) {
            return 404;
        }

        if ($e instanceof AuthorizationException) {
            return 403;
        }

        return 500;
    }

    protected function normalizeExceptionMessage(Throwable $e): string
    {
        $message = trim($e->getMessage() ?: class_basename($e));

        // Trim noisy SQL connection suffixes:
        // "... (Connection: mysql, SQL: ...)".
        $message = preg_replace('/\s*\(Connection:.*$/', '', $message) ?? $message;

        return trim($message) !== '' ? trim($message) : class_basename($e);
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
    protected function getModelIfAllowed(string $model, $id, string $gate, bool $withTrashed = false)
    {
        
        $class = 'App\\Models\\' . Str::studly($model);
        if (!class_exists($class)) {
            throw new NotFoundHttpException("Model not found: {$class}");
        }

        $obj = new $class();
        if (!($obj instanceof Base)) {
            throw new BadRequestHttpException("Model not api compatible: {$class}");
        }
        if ($id) {
            $query = $obj->newQuery();
            if ($withTrashed && in_array(SoftDeletes::class, class_uses_recursive($class), true)) {
                $query = $query->withTrashed();
            }

            $obj = $query->findOrFail($id);
        }
        if (!Gate::allows($gate, ($id ? $obj : $obj::class)) ) {
            throw new AuthorizationException("Not allowed: {$gate} on {$class}");
        }
        return $obj;
    }

    public function search(Request $request, string $model)
    {
        return $this->runApi($request, function () use ($request, $model) {
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
        }, [
            'action' => 'search',
            'model' => $model,
        ]);
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
        return $this->runApi($request, function () use ($request, $model, $id) {
            $modelObj = $this->getModelIfAllowed($model, $id, 'view');
            if ($modelObj instanceof Base) {        
                return response()->json($modelObj->prepareForApi($request));
            }
            return response()->json($modelObj->toArray());
        }, [
            'action' => 'get',
            'model' => $model,
            'id' => $id,
        ]);
    }

    public function create(Request $request, string $model)
    {
        return $this->runApi($request, function () use ($request, $model) {
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
        }, [
            'action' => 'create',
            'model' => $model,
        ]);
    }

    public function update(Request $request, string $model, $id)
    {
        return $this->runApi($request, function () use ($request, $model, $id) {
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
        }, [
            'action' => 'update',
            'model' => $model,
            'id' => $id,
        ]);
    }


    public function delete(Request $request, string $model, $id)
    {
        return $this->runApi($request, function () use ($request, $model, $id) {
            $modelObj = $this->getModelIfAllowed($model, $id, 'delete');
            $return = $modelObj->prepareForApi($request)->toArray();
            $modelObj->delete();
            return response()->json($return);
        }, [
            'action' => 'delete',
            'model' => $model,
            'id' => $id,
        ]);
    }

    public function restore(Request $request, string $model, $id)
    {
        return $this->runApi($request, function () use ($request, $model, $id) {
            $modelObj = $this->getModelIfAllowed($model, $id, 'restore', true);
            if (!in_array(SoftDeletes::class, class_uses_recursive($modelObj::class), true)) {
                throw new BadRequestHttpException('Model does not support restore.');
            }

            if (!$modelObj->trashed()) {
                return response()->json($modelObj->prepareForApi($request)->toArray());
            }

            $modelObj->restore();
            $modelObj->refresh();

            return response()->json($modelObj->prepareForApi($request)->toArray());
        }, [
            'action' => 'restore',
            'model' => $model,
            'id' => $id,
        ]);
    }

    public function forceDelete(Request $request, string $model, $id)
    {
        return $this->runApi($request, function () use ($request, $model, $id) {
            $modelObj = $this->getModelIfAllowed($model, $id, 'forceDelete', true);
            if (!in_array(SoftDeletes::class, class_uses_recursive($modelObj::class), true)) {
                throw new BadRequestHttpException('Model does not support force delete.');
            }

            $return = $modelObj->prepareForApi($request)->toArray();
            $modelObj->forceDelete();

            return response()->json($return);
        }, [
            'action' => 'forceDelete',
            'model' => $model,
            'id' => $id,
        ]);
    }



}
