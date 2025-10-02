<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Services\HubManager;
use App\Http\Controllers\Controller;
use App\Services\HubManager as ServicesHubManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;
use Illuminate\Foundation\Application;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

class HomeController extends Controller
{

    public function welcome(HubManager $hubManager, Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
    
        return Inertia::render('Welcome', [
            'guestMode' => $hubManager->current()->enable_guestmode ?: false,
            'canRegister' => $hubManager->current()->enable_registration ?: false,
        ]);
    }

    public function dashboard(Request $request): Response|RedirectResponse
    {
        return Inertia::render('Dashboard');
    }


}
