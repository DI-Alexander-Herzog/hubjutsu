<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

class HomeController extends Controller
{

    public function welcome(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
    
        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
            'brandImage' => asset('storage/img/brandimage.jpeg'),
        ]);
    }

    public function dashboard(Request $request): Response
    {
        return Inertia::render('Dashboard');
    }


}
