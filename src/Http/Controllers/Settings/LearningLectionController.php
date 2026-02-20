<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class LearningLectionController extends Controller
{
    public function index()
    {
        return Inertia::render('LearningLection/Index');
    }
}
