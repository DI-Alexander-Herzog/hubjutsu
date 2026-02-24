<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\LearningLection;
use Inertia\Inertia;

class LearningLectionController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Learning/Lection/Index');
    }

    public function edit(LearningLection $learninglection)
    {
        $learninglection->loadMissing([
            'section.module.course.cover',
            'section.module.cover',
            'image',
            'video',
            'attachments',
        ]);

        return Inertia::render('Admin/Learning/Lection/Edit', [
            'learning_lection' => $learninglection,
        ]);
    }
}
