<?php

use App\Http\Controllers\Api\HubjutsuApiController;
use App\Http\Controllers\Api\HubjutsuApiTokenController;

Route::name('api.token.')->group(function() {
    Route::withoutMiddleware(['auth:sanctum'])->post('/token/create', [HubjutsuApiTokenController::class, 'create'])->name('create'); // Similar to login
    Route::middleware(['auth:sanctum'])->group(function() {
        Route::delete('/token/delete', [HubjutsuApiController::class, 'delete'])->name('delete'); // Similar to logout
        Route::get('/token/list', [HubjutsuApiController::class, 'list'])->name('list');
    });
});

Route::middleware(['auth:sanctum'])->name('api.')->group(function() {
    Route::get('/{model}/{id}', [HubjutsuApiController::class, 'get'])->name('get');
    Route::get('/{model}', [HubjutsuApiController::class, 'search'])->name('search');
    Route::match(['post', 'put'], '/{model}/{id}/restore', [HubjutsuApiController::class, 'restore'])->name('restore');
    Route::match(['post', 'put'], '/{model}/{id}', [HubjutsuApiController::class, 'update'])->name('update');
    Route::match(['post', 'put'], '/{model}', [HubjutsuApiController::class, 'create'])->name('create');
    Route::delete('/{model}/{id}/force', [HubjutsuApiController::class, 'forceDelete'])->name('forceDelete');
    Route::delete('/{model}/{id}', [HubjutsuApiController::class, 'delete'])->name('delete');
});


