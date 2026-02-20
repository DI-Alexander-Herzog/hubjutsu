<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use Inertia\Inertia;

class LearningCourseController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Learning/Course/Index');
    }

    public function show(LearningCourse $learningcourse)
    {
        $learningcourse->loadMissing(['cover', 'bundles']);

        return Inertia::render('Admin/Learning/Course/View', [
            'learning_course' => $learningcourse,
        ]);
    }

    public function edit(LearningCourse $learningcourse)
    {
        $learningcourse->loadMissing(['cover', 'bundles']);

        return Inertia::render('Admin/Learning/Course/Edit', [
            'learning_course' => $learningcourse,
        ]);
    }
}
