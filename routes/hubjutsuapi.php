<?php

use App\Http\Controllers\Api\HubjutsuApiAppDataController;
use App\Http\Controllers\Api\HubjutsuApiController;
use App\Http\Controllers\Api\HubjutsuApiTokenController;

Route::name('api.token.')->group(function() {
    Route::post('/token/create', [HubjutsuApiTokenController::class, 'create'])->name('create'); // Similar to login
    Route::middleware(['auth:sanctum'])->group(function() {
        Route::get('/token/valid', [HubjutsuApiTokenController::class, 'valid'])->name('valid');
        Route::addRoute(['POST', 'DELETE'], '/token/delete', [HubjutsuApiTokenController::class, 'delete'])->name('delete'); // Similar to logout
        Route::addRoute(['POST', 'DELETE'], '/token/deleteAll', [HubjutsuApiTokenController::class, 'deleteAll'])->name('delete.all'); // Similar to logout
        Route::get('/token/list', [HubjutsuApiTokenController::class, 'list'])->name('list');
    });
});

Route::name('api.appData')->group(function() {
    Route::get('/appData', [HubjutsuApiAppDataController::class, 'getAppData']);
});

Route::middleware(['auth:sanctum'])->name('api.')->group(function() {
    Route::name('model')->prefix('model')->group(function() {
        Route::get('/{model}/{id}', [HubjutsuApiController::class, 'get'])->name('get');
        Route::get('/{model}', [HubjutsuApiController::class, 'search'])->name('search');
        Route::match(['post', 'put'], '/{model}/{id}/restore', [HubjutsuApiController::class, 'restore'])->name('restore');
        Route::match(['post', 'put'], '/{model}/{id}', [HubjutsuApiController::class, 'update'])->name('update');
        Route::match(['post', 'put'], '/{model}', [HubjutsuApiController::class, 'create'])->name('create');
        Route::delete('/{model}/{id}/force', [HubjutsuApiController::class, 'forceDelete'])->name('forceDelete');
        Route::delete('/{model}/{id}', [HubjutsuApiController::class, 'delete'])->name('delete');
    });
});

Route::any('/{any}', function() {
    return response()->json(['error' => 'Not Found'], 404);
})->where('any', '.*');


