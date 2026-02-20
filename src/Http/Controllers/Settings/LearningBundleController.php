<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class LearningBundleController extends Controller
{
    public function index()
    {
        return Inertia::render('LearningBundle/Index');
    }
}
