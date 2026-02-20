<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class LearningModuleController extends Controller
{
    public function index()
    {
        return Inertia::render('LearningModule/Index');
    }
}
