<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class LearningSectionController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Learning/Section/Index');
    }
}
