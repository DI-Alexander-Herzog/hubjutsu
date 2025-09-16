<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\HomeController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\HubController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserHubRoleController;


Route::name('admin.')->prefix('admin')->group(function() {
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/userhubroles', [UserHubRoleController::class, 'index'])->name('userhubroles.index');
        Route::get('/userhubroles/create', [UserHubRoleController::class, 'create'])->name('userhubroles.create');
        Route::post('/userhubroles', [UserHubRoleController::class, 'store'])->name('userhubroles.store');
        Route::get('/userhubroles/{userhubrole}', [UserHubRoleController::class, 'show'])->name('userhubroles.show');
        Route::get('/userhubroles/{userhubrole}/edit', [UserHubRoleController::class, 'edit'])->name('userhubroles.edit');
        Route::addRoute(['PUT', 'POST', 'PATCH'], '/userhubroles/{userhubrole}', [UserHubRoleController::class, 'update'])->name('userhubroles.update');
        Route::delete('/userhubroles/{userhubrole}', [UserHubRoleController::class, 'destroy'])->name('userhubroles.destroy');
    });

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
        Route::get('/roles/create', [RoleController::class, 'create'])->name('roles.create');
        Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
        Route::get('/roles/{role}', [RoleController::class, 'show'])->name('roles.show');
        Route::get('/roles/{role}/edit', [RoleController::class, 'edit'])->name('roles.edit');
        Route::addRoute(['PUT', 'POST', 'PATCH'], '/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/hubs', [HubController::class, 'index'])->name('hubs.index');
        Route::get('/hubs/create', [HubController::class, 'create'])->name('hubs.create');
        Route::post('/hubs', [HubController::class, 'store'])->name('hubs.store');
        Route::get('/hubs/{hub}', [HubController::class, 'show'])->name('hubs.show');
        Route::get('/hubs/{hub}/edit', [HubController::class, 'edit'])->name('hubs.edit');
        Route::addRoute(['PUT', 'POST', 'PATCH'], '/hubs/{hub}', [HubController::class, 'update'])->name('hubs.update');
        Route::delete('/hubs/{hub}', [HubController::class, 'destroy'])->name('hubs.destroy');
    });
        

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
        Route::addRoute(['PUT', 'POST', 'PATCH'], '/users/{hub}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{hub}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});

Route::get('/', [HomeController::class, 'welcome'])->name('welcome');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar');
        
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [HomeController::class, 'dashboard'])->name('dashboard');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/media/upload', [MediaController::class, 'upload'])->name('media.upload');
    Route::post('/media/chunked-upload', [MediaController::class, 'chunkedUpload'])->name('media.chunked-upload');
});

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
                ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
                ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
                ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
                ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
                ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
                ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
                ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
                ->middleware(['signed', 'throttle:6,1'])
                ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
                ->middleware('throttle:6,1')
                ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
                ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
                ->name('logout');
});

