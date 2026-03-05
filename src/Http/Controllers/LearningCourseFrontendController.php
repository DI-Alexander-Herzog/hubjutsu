<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\LearningBundle;
use App\Models\LearningCourse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LearningCourseFrontendController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';

        $accessibleBundleIds = LearningBundle::query()
            ->accessible($user, $bundleViewPermission)
            ->pluck('id')
            ->map(fn ($id) => intval($id))
            ->all();

        $courses = LearningCourse::query()
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->withCount('modules')
            ->orderBy('name')
            ->get()
            ->map(function (LearningCourse $course) use ($accessibleBundleIds) {
                $course->setRelation(
                    'bundles',
                    $course->bundles
                        ->whereIn('id', $accessibleBundleIds)
                        ->values()
                );

                return $course;
            })
            ->values();

        return Inertia::render('Learning/Course/Index', [
            'courses' => $courses,
        ]);
    }
}
