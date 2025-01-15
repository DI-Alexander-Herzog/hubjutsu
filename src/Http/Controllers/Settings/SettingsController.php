<?php
namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller {

    public function index(Request $request) {
        return Inertia::render('Settings/Index', [
            'user' => $request->user(),
        ]);
    }
}