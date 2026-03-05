<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\LearningBundle;
use App\Models\LearningCourse;
use App\Models\LearningCourseUserProgress;
use App\Models\LearningLection;
use App\Models\LearningLectionUserProgress;
use App\Models\LearningModule;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LearningCourseFrontendController extends Controller
{
    protected function accessibleBundleIds($user): array
    {
        $bundleViewPermission = LearningBundle::class . '::view';

        return LearningBundle::query()
            ->accessible($user, $bundleViewPermission)
            ->pluck('id')
            ->map(fn ($id) => intval($id))
            ->all();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';
        $accessibleBundleIds = $this->accessibleBundleIds($user);

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

        $progressByCourseId = LearningCourseUserProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('learning_course_id', $courses->pluck('id')->all())
            ->get()
            ->keyBy('learning_course_id');

        $courses = $courses->map(function (LearningCourse $course) use ($progressByCourseId) {
            $progress = $progressByCourseId->get($course->id);
            $course->setAttribute('progress', $this->normalizeProgress($progress));

            return $course;
        });

        return Inertia::render('Learning/Course/Index', [
            'courses' => $courses,
        ]);
    }

    public function show(Request $request, LearningCourse $learningcourse)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->with([
                'bundles',
                'cover',
                'modules' => fn ($query) => $query
                    ->where('active', true)
                    ->with([
                        'sections' => fn ($sectionsQuery) => $sectionsQuery
                            ->where('active', true)
                            ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
                    ]),
            ])
            ->firstOrFail();

        $course->setRelation(
            'bundles',
            $course->bundles
                ->whereIn('id', $accessibleBundleIds)
                ->values()
        );

        $progress = LearningCourseUserProgress::query()
            ->where('user_id', $user->id)
            ->where('learning_course_id', $course->id)
            ->first();
        $course->setAttribute('progress', $this->normalizeProgress($progress));

        $this->decorateModulesWithProgress($course->modules, $user->id);

        return Inertia::render('Learning/Course/Show', [
            'course' => $course,
        ]);
    }

    public function module(Request $request, LearningCourse $learningcourse, string $learningmoduleslug)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->firstOrFail();

        $module = LearningModule::query()
            ->where('learning_course_id', $course->id)
            ->where('slug', $learningmoduleslug)
            ->where('active', true)
            ->with('cover')
            ->with([
                'sections' => fn ($sectionsQuery) => $sectionsQuery
                    ->where('active', true)
                    ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
            ])
            ->firstOrFail();

        $this->decorateModulesWithProgress(collect([$module]), $user->id);

        return Inertia::render('Learning/Module/Show', [
            'course' => $course,
            'module' => $module,
        ]);
    }

    public function lection(Request $request, LearningCourse $learningcourse, string $learningmoduleslug, LearningLection $learninglection)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->firstOrFail();

        $module = LearningModule::query()
            ->where('learning_course_id', $course->id)
            ->where('slug', $learningmoduleslug)
            ->where('active', true)
            ->with('cover')
            ->with([
                'sections' => fn ($sectionsQuery) => $sectionsQuery
                    ->where('active', true)
                    ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
            ])
            ->firstOrFail();

        $this->decorateModulesWithProgress(collect([$module]), $user->id);

        $lection = $module->sections
            ->flatMap(fn ($section) => $section->lections)
            ->firstWhere('id', $learninglection->id);

        abort_unless($lection !== null, 404);

        $lectionProgress = LearningLectionUserProgress::query()
            ->where('user_id', $user->id)
            ->where('learning_lection_id', $lection->id)
            ->first();

        $lection->setAttribute('progress', [
            'status' => $lectionProgress?->status ?? LearningLectionUserProgress::STATUS_NOT_STARTED,
            'started' => $lectionProgress !== null && $lectionProgress->status !== LearningLectionUserProgress::STATUS_NOT_STARTED,
            'completed' => $lectionProgress?->status === LearningLectionUserProgress::STATUS_COMPLETED,
            'video_position_seconds' => intval($lectionProgress?->video_position_seconds ?? 0),
        ]);

        return Inertia::render('Learning/Lection/Show', [
            'course' => $course,
            'module' => $module,
            'lection' => $lection,
        ]);
    }

    public function start(Request $request, LearningCourse $learningcourse)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->firstOrFail();

        $progress = LearningCourseUserProgress::query()->firstOrNew([
            'user_id' => $user->id,
            'learning_course_id' => $course->id,
        ]);

        if (!$progress->exists) {
            $progress->status = LearningCourseUserProgress::STATUS_NOT_STARTED;
            $progress->progress_percent = 0;
        }

        if ($progress->status === LearningCourseUserProgress::STATUS_NOT_STARTED) {
            $progress->status = LearningCourseUserProgress::STATUS_STARTED;
        }

        if (!$progress->started_at) {
            $progress->started_at = now();
        }

        $progress->last_visited_at = now();
        $progress->save();

        return redirect()->route('learning.courses.show', [
            'learningcourse' => $course->slug,
        ]);
    }

    public function reset(Request $request, LearningCourse $learningcourse)
    {
        $user = $request->user();
        $bundleViewPermission = LearningBundle::class . '::view';

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->accessible($user, $bundleViewPermission)
            ->firstOrFail();

        LearningCourseUserProgress::query()
            ->where('user_id', $user->id)
            ->where('learning_course_id', $course->id)
            ->delete();

        $lectionIds = LearningLection::query()
            ->whereHas('section.module', fn ($query) => $query->where('learning_course_id', $course->id))
            ->pluck('id')
            ->all();

        if (!empty($lectionIds)) {
            LearningLectionUserProgress::query()
                ->where('user_id', $user->id)
                ->whereIn('learning_lection_id', $lectionIds)
                ->delete();
        }

        return redirect()->route('learning.courses.show', [
            'learningcourse' => $course->slug,
        ]);
    }

    protected function normalizeProgress(?LearningCourseUserProgress $progress): array
    {
        return [
            'started' => $progress !== null && $progress->status !== LearningCourseUserProgress::STATUS_NOT_STARTED,
            'status' => $progress?->status ?? LearningCourseUserProgress::STATUS_NOT_STARTED,
            'progress_percent' => intval($progress?->progress_percent ?? 0),
            'started_at' => optional($progress?->started_at)?->toISOString(),
            'finished_at' => optional($progress?->finished_at)?->toISOString(),
            'completed_at' => optional($progress?->completed_at)?->toISOString(),
        ];
    }

    protected function decorateModulesWithProgress(Collection $modules, int $userId): void
    {
        $lectionIds = $modules
            ->flatMap(fn ($module) => $module->sections->flatMap(fn ($section) => $section->lections->pluck('id')))
            ->unique()
            ->values()
            ->all();

        if (empty($lectionIds)) {
            $modules->each(function ($module) {
                $module->setAttribute('progress', [
                    'percent' => 0,
                    'started' => false,
                    'completed' => false,
                    'total_lections' => 0,
                    'completed_lections' => 0,
                    'total_minutes' => 0,
                ]);
            });
            return;
        }

        $lectionProgressById = LearningLectionUserProgress::query()
            ->where('user_id', $userId)
            ->whereIn('learning_lection_id', $lectionIds)
            ->get()
            ->keyBy('learning_lection_id');

        $modules->each(function ($module) use ($lectionProgressById) {
            $lections = $module->sections->flatMap(fn ($section) => $section->lections);
            $totalLections = $lections->count();
            $totalMinutes = intval($lections->sum(fn ($lection) => intval($lection->duration_minutes ?? 0)));

            $startedLections = $lections
                ->filter(function ($lection) use ($lectionProgressById) {
                    $progress = $lectionProgressById->get($lection->id);
                    if (!$progress) {
                        return false;
                    }

                    return in_array($progress->status, [
                        LearningLectionUserProgress::STATUS_STARTED,
                        LearningLectionUserProgress::STATUS_FINISHED,
                        LearningLectionUserProgress::STATUS_COMPLETED,
                    ], true);
                })
                ->count();

            $completedLections = $lections
                ->filter(function ($lection) use ($lectionProgressById) {
                    $progress = $lectionProgressById->get($lection->id);
                    return $progress?->status === LearningLectionUserProgress::STATUS_COMPLETED;
                })
                ->count();

            $progressPercent = $totalLections > 0
                ? intval(round(($completedLections / $totalLections) * 100))
                : 0;

            $module->setAttribute('progress', [
                'percent' => $progressPercent,
                'started' => $startedLections > 0,
                'completed' => $progressPercent >= 100,
                'total_lections' => $totalLections,
                'completed_lections' => $completedLections,
                'total_minutes' => $totalMinutes,
            ]);

            $module->sections->each(function ($section) use ($lectionProgressById) {
                $section->lections->each(function ($lection) use ($lectionProgressById) {
                    $progress = $lectionProgressById->get($lection->id);
                    $status = $progress?->status ?? LearningLectionUserProgress::STATUS_NOT_STARTED;

                    $lection->setAttribute('progress', [
                        'status' => $status,
                        'started' => $status !== LearningLectionUserProgress::STATUS_NOT_STARTED,
                        'completed' => $status === LearningLectionUserProgress::STATUS_COMPLETED,
                    ]);
                });
            });
        });
    }
}
