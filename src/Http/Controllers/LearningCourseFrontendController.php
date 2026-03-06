<?php

namespace AHerzog\Hubjutsu\Http\Controllers;

use App\Models\LearningBundle;
use App\Models\LearningCourse;
use App\Models\LearningCourseUserProgress;
use App\Models\LearningLection;
use App\Models\LearningLectionUserProgress;
use App\Models\LearningModule;
use App\Models\LearningSection;
use App\Models\RoleAssignment;
use App\Services\HubManager;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LearningCourseFrontendController extends Controller
{
    protected function accessibleBundleIds($user): array
    {
        $hub = app(HubManager::class)->current();
        $roleIds = RoleAssignment::query()
            ->where('user_id', $user->id)
            ->where('scope_type', $hub->getMorphClass())
            ->where('scope_id', $hub->getKey())
            ->pluck('role_id')
            ->map(fn ($id) => intval($id))
            ->unique()
            ->values()
            ->all();

        if (empty($roleIds)) {
            return [];
        }

        return LearningBundle::query()
            ->where('active', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('roles.id', $roleIds))
            ->pluck('id')
            ->map(fn ($id) => intval($id))
            ->all();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        $courses = collect();
        if (!empty($accessibleBundleIds)) {
            $courses = LearningCourse::query()
                ->where('active', true)
                ->whereHas('bundles', fn ($query) => $query
                    ->whereIn('learning_bundles.id', $accessibleBundleIds)
                    ->where('learning_bundles.active', true)
                )
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
        }

        $progressByCourseId = LearningCourseUserProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('learning_course_id', $courses->pluck('id')->all())
            ->get()
            ->keyBy('learning_course_id');
        $calculatedProgressByCourseId = $this->calculateCourseProgressMap(
            $courses->pluck('id')->map(fn ($id) => intval($id))->all(),
            $user->id,
            $progressByCourseId->all(),
        );

        $courses = $courses->map(function (LearningCourse $course) use ($calculatedProgressByCourseId) {
            $course->setAttribute('progress', $calculatedProgressByCourseId[intval($course->id)] ?? $this->emptyProgress());

            return $course;
        });

        return Inertia::render('Learning/Course/Index', [
            'courses' => $courses,
        ]);
    }

    public function show(Request $request, LearningCourse $learningcourse)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
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
        $course->setAttribute('progress', $this->calculateCourseProgress($course, $user->id, $progress));

        $this->decorateModulesWithProgress($course->modules, $user->id);

        return Inertia::render('Learning/Course/Show', [
            'course' => $course,
        ]);
    }

    public function module(Request $request, LearningCourse $learningcourse, string $learningmoduleslug)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
            ->firstOrFail();
        $this->assertCourseStarted($user->id, $course->id);

        $courseModules = LearningModule::query()
            ->where('learning_course_id', $course->id)
            ->where('active', true)
            ->with('cover')
            ->with([
                'sections' => fn ($sectionsQuery) => $sectionsQuery
                    ->where('active', true)
                    ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
            ])
            ->orderBy('sort')
            ->orderBy('id')
            ->get();

        $module = $courseModules->firstWhere('slug', $learningmoduleslug);
        abort_unless($module !== null, 404);

        $this->decorateModulesWithProgress($courseModules, $user->id);

        return Inertia::render('Learning/Module/Show', [
            'course' => $course,
            'module' => $module,
            'courseModules' => $courseModules->values(),
        ]);
    }

    public function lection(Request $request, LearningCourse $learningcourse, string $learningmoduleslug, LearningLection $learninglection)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
            ->firstOrFail();
        $this->assertCourseStarted($user->id, $course->id);

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
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
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

    public function completeLection(Request $request, LearningCourse $learningcourse, string $learningmoduleslug, LearningLection $learninglection)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
            ->firstOrFail();
        $courseProgress = $this->assertCourseStarted($user->id, $course->id);

        $module = LearningModule::query()
            ->where('learning_course_id', $course->id)
            ->where('slug', $learningmoduleslug)
            ->where('active', true)
            ->with([
                'sections' => fn ($sectionsQuery) => $sectionsQuery
                    ->where('active', true)
                    ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
            ])
            ->firstOrFail();

        $lection = $module->sections
            ->flatMap(fn ($section) => $section->lections)
            ->firstWhere('id', $learninglection->id);

        abort_unless($lection !== null, 404);

        $progress = LearningLectionUserProgress::query()->firstOrNew([
            'user_id' => $user->id,
            'learning_lection_id' => $lection->id,
        ]);

        if (!$progress->exists) {
            $progress->status = LearningLectionUserProgress::STATUS_NOT_STARTED;
            $progress->video_position_seconds = 0;
            $progress->watched_seconds = 0;
        }

        if (!$progress->started_at) {
            $progress->started_at = now();
        }

        $progress->status = LearningLectionUserProgress::STATUS_COMPLETED;
        $progress->last_watched_at = now();
        $progress->finished_at = $progress->finished_at ?: now();
        $progress->completed_at = now();
        $progress->save();
        $this->syncCourseProgressForUser($course->id, $user->id, $courseProgress);

        $currentSection = $module->sections
            ->first(fn ($section) => $section->lections->contains(fn ($entry) => intval($entry->id) === intval($lection->id)));

        if ($currentSection) {
            $sectionLections = $currentSection->lections->values();
            $currentSectionIndex = $sectionLections->search(fn ($entry) => intval($entry->id) === intval($lection->id));
            $nextLectionInSection = $currentSectionIndex !== false
                ? $sectionLections->get(intval($currentSectionIndex) + 1)
                : null;

            if ($nextLectionInSection) {
                return redirect()->route('learning.lections.show', [
                    'learningcourse' => $course->slug,
                    'learningmoduleslug' => $module->slug,
                    'learninglection' => $nextLectionInSection->id,
                ]);
            }
        }

        if ($currentSection) {
            return redirect()->route('learning.sections.transition', [
                'learningcourse' => $course->slug,
                'learningmoduleslug' => $module->slug,
                'learningsection' => $currentSection->id,
            ]);
        }

        return redirect()->route('learning.modules.show', [
            'learningcourse' => $course->slug,
            'learningmoduleslug' => $module->slug,
        ]);
    }

    public function sectionTransition(Request $request, LearningCourse $learningcourse, string $learningmoduleslug, LearningSection $learningsection)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
            ->with([
                'modules' => fn ($modulesQuery) => $modulesQuery
                    ->where('active', true)
                    ->with([
                        'sections' => fn ($sectionsQuery) => $sectionsQuery
                            ->where('active', true)
                            ->with(['lections' => fn ($lectionsQuery) => $lectionsQuery->where('active', true)]),
                    ]),
            ])
            ->firstOrFail();
        $this->assertCourseStarted($user->id, $course->id);

        $module = $course->modules
            ->first(fn ($entry) => $entry->slug === $learningmoduleslug);
        abort_unless($module !== null, 404);

        $sections = $module->sections->values();
        $currentSectionIndex = $sections->search(fn ($entry) => intval($entry->id) === intval($learningsection->id));
        abort_unless($currentSectionIndex !== false, 404);
        $currentSection = $sections->get(intval($currentSectionIndex));
        $nextSection = $sections->get(intval($currentSectionIndex) + 1);

        $modules = $course->modules->values();
        $currentModuleIndex = $modules->search(fn ($entry) => intval($entry->id) === intval($module->id));
        $nextModule = $currentModuleIndex !== false ? $modules->get(intval($currentModuleIndex) + 1) : null;

        return Inertia::render('Learning/Section/Transition', [
            'course' => $course,
            'module' => $module,
            'section' => $currentSection,
            'next_section' => $nextSection,
            'next_module' => $nextModule,
        ]);
    }

    public function reset(Request $request, LearningCourse $learningcourse)
    {
        $user = $request->user();
        $accessibleBundleIds = $this->accessibleBundleIds($user);

        if (empty($accessibleBundleIds)) {
            abort(404);
        }

        $course = LearningCourse::query()
            ->whereKey($learningcourse->getKey())
            ->where('active', true)
            ->whereHas('bundles', fn ($query) => $query
                ->whereIn('learning_bundles.id', $accessibleBundleIds)
                ->where('learning_bundles.active', true)
            )
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

        $progress = LearningCourseUserProgress::query()
            ->where('user_id', $user->id)
            ->where('learning_course_id', $course->id)
            ->first();
        if ($progress) {
            $progress->status = LearningCourseUserProgress::STATUS_NOT_STARTED;
            $progress->progress_percent = 0;
            $progress->started_at = null;
            $progress->finished_at = null;
            $progress->completed_at = null;
            $progress->last_visited_at = now();
            $progress->save();
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

    protected function emptyProgress(): array
    {
        return [
            'started' => false,
            'status' => LearningCourseUserProgress::STATUS_NOT_STARTED,
            'progress_percent' => 0,
            'started_at' => null,
            'finished_at' => null,
            'completed_at' => null,
        ];
    }

    protected function calculateCourseProgress(LearningCourse $course, int $userId, ?LearningCourseUserProgress $persisted): array
    {
        $map = $this->calculateCourseProgressMap([intval($course->id)], $userId, [
            intval($course->id) => $persisted,
        ]);

        return $map[intval($course->id)] ?? $this->emptyProgress();
    }

    /**
     * @param array<int, int> $courseIds
     * @param array<int, LearningCourseUserProgress|null> $persistedByCourseId
     * @return array<int, array<string, mixed>>
     */
    protected function calculateCourseProgressMap(array $courseIds, int $userId, array $persistedByCourseId = []): array
    {
        $courseIds = array_values(array_unique(array_map(fn ($id) => intval($id), $courseIds)));
        if (empty($courseIds)) {
            return [];
        }

        $totalByCourse = LearningLection::query()
            ->selectRaw('learning_modules.learning_course_id as course_id, COUNT(*) as aggregate')
            ->join('learning_sections', 'learning_sections.id', '=', 'learning_lections.learning_section_id')
            ->join('learning_modules', 'learning_modules.id', '=', 'learning_sections.learning_module_id')
            ->whereIn('learning_modules.learning_course_id', $courseIds)
            ->where('learning_modules.active', true)
            ->where('learning_sections.active', true)
            ->where('learning_lections.active', true)
            ->groupBy('learning_modules.learning_course_id')
            ->pluck('aggregate', 'course_id');

        $completedByCourse = LearningLection::query()
            ->selectRaw('learning_modules.learning_course_id as course_id, COUNT(DISTINCT learning_lections.id) as aggregate')
            ->join('learning_sections', 'learning_sections.id', '=', 'learning_lections.learning_section_id')
            ->join('learning_modules', 'learning_modules.id', '=', 'learning_sections.learning_module_id')
            ->join('learning_lection_user_progress as llup', function ($join) use ($userId) {
                $join->on('llup.learning_lection_id', '=', 'learning_lections.id')
                    ->where('llup.user_id', '=', $userId)
                    ->where('llup.status', '=', LearningLectionUserProgress::STATUS_COMPLETED);
            })
            ->whereIn('learning_modules.learning_course_id', $courseIds)
            ->where('learning_modules.active', true)
            ->where('learning_sections.active', true)
            ->where('learning_lections.active', true)
            ->groupBy('learning_modules.learning_course_id')
            ->pluck('aggregate', 'course_id');

        $result = [];
        foreach ($courseIds as $courseId) {
            $total = intval($totalByCourse[$courseId] ?? 0);
            $completed = intval($completedByCourse[$courseId] ?? 0);
            $percent = $total > 0 ? intval(round(($completed / $total) * 100)) : 0;

            $persisted = $persistedByCourseId[$courseId] ?? null;
            $started = $completed > 0 || ($persisted !== null && $persisted->status !== LearningCourseUserProgress::STATUS_NOT_STARTED);
            $status = $completed > 0 && $completed >= $total && $total > 0
                ? LearningCourseUserProgress::STATUS_COMPLETED
                : ($started ? LearningCourseUserProgress::STATUS_STARTED : LearningCourseUserProgress::STATUS_NOT_STARTED);

            $result[$courseId] = [
                'started' => $started,
                'status' => $status,
                'progress_percent' => $percent,
                'started_at' => optional($persisted?->started_at)?->toISOString(),
                'finished_at' => optional($persisted?->finished_at)?->toISOString(),
                'completed_at' => optional($persisted?->completed_at)?->toISOString(),
            ];
        }

        return $result;
    }

    protected function assertCourseStarted(int $userId, int $courseId): LearningCourseUserProgress
    {
        $progress = LearningCourseUserProgress::query()
            ->where('user_id', $userId)
            ->where('learning_course_id', $courseId)
            ->first();

        abort_unless(
            $progress !== null && $progress->status !== LearningCourseUserProgress::STATUS_NOT_STARTED,
            403,
            'Course not started.'
        );

        return $progress;
    }

    protected function syncCourseProgressForUser(int $courseId, int $userId, ?LearningCourseUserProgress $persisted = null): void
    {
        $progress = $persisted ?: LearningCourseUserProgress::query()
            ->where('user_id', $userId)
            ->where('learning_course_id', $courseId)
            ->first();

        if (!$progress) {
            return;
        }

        $computed = $this->calculateCourseProgressMap([$courseId], $userId, [$courseId => $progress]);
        $payload = $computed[$courseId] ?? null;
        if (!$payload) {
            return;
        }

        $progress->status = $payload['status'];
        $progress->progress_percent = intval($payload['progress_percent'] ?? 0);
        $progress->last_visited_at = now();
        if ($progress->status === LearningCourseUserProgress::STATUS_COMPLETED && !$progress->completed_at) {
            $progress->completed_at = now();
            $progress->finished_at = $progress->finished_at ?: now();
        }
        $progress->save();
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
