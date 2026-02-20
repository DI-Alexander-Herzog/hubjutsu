<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\LearningBundle;
use Inertia\Inertia;

class LearningBundleController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Learning/Bundle/Index');
    }

    public function show(LearningBundle $learningbundle)
    {
        return Inertia::render('Admin/Learning/Bundle/View', [
            'learning_bundle' => $learningbundle,
        ]);
    }

    public function edit(LearningBundle $learningbundle)
    {
        return Inertia::render('Admin/Learning/Bundle/Edit', [
            'learning_bundle' => $learningbundle,
        ]);
    }
}
