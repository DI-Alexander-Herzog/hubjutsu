<?php

namespace AHerzog\Hubjutsu\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\LearningLection;
use App\Models\LearningModule;
use App\Models\LearningSection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $learningcourse->loadMissing(['cover', 'bodyImages', 'bundles', 'modules.cover', 'modules.sections']);

        return Inertia::render('Admin/Learning/Course/View', [
            'learning_course' => $learningcourse,
        ]);
    }

    public function edit(LearningCourse $learningcourse)
    {
        $learningcourse->loadMissing(['cover', 'bodyImages', 'bundles', 'modules.cover', 'modules.sections']);

        return Inertia::render('Admin/Learning/Course/Edit', [
            'learning_course' => $learningcourse,
        ]);
    }

    public function importStructure(Request $request, LearningCourse $learningcourse)
    {
        $payload = $request->validate([
            'content' => ['required', 'string'],
            'format' => ['nullable', 'in:auto,markdown,html'],
            'replace_existing' => ['nullable', 'boolean'],
        ]);

        $content = trim((string)($payload['content'] ?? ''));
        $format = $payload['format'] ?? 'auto';
        $replaceExisting = (bool)($payload['replace_existing'] ?? false);

        $headings = $this->extractHeadings($content, $format);
        if (count($headings) === 0) {
            return response()->json([
                'message' => 'Keine Überschriften gefunden.',
            ], 422);
        }

        $levels = array_values(array_unique(array_map(fn ($h) => $h['level'], $headings)));
        sort($levels);

        DB::transaction(function () use ($learningcourse, $replaceExisting, $headings, $levels) {
            if ($replaceExisting) {
                $moduleIds = $learningcourse->modules()->pluck('id');
                $sectionIds = LearningSection::query()->whereIn('learning_module_id', $moduleIds)->pluck('id');
                LearningLection::query()->whereIn('learning_section_id', $sectionIds)->delete();
                LearningSection::query()->whereIn('id', $sectionIds)->delete();
                LearningModule::query()->whereIn('id', $moduleIds)->delete();
            }

            $moduleSort = (int)($learningcourse->modules()->max('sort') ?? 0);
            $currentModule = null;
            $currentSection = null;
            $sectionSortByModule = [];
            $lectionSortBySection = [];

            foreach ($headings as $heading) {
                $depth = array_search($heading['level'], $levels, true);
                $depth = $depth === false ? 0 : $depth;
                $title = $heading['text'];
                $description = trim((string)($heading['description'] ?? ''));

                if ($depth === 0) {
                    $moduleSort += 10;
                    $currentModule = LearningModule::query()->create([
                        'learning_course_id' => $learningcourse->id,
                        'name' => $title,
                        'description' => $description,
                        'active' => true,
                        'sort' => $moduleSort,
                    ]);
                    $currentSection = null;
                    continue;
                }

                if (!$currentModule) {
                    $moduleSort += 10;
                    $currentModule = LearningModule::query()->create([
                        'learning_course_id' => $learningcourse->id,
                        'name' => 'Importiertes Modul',
                        'description' => '',
                        'active' => true,
                        'sort' => $moduleSort,
                    ]);
                }

                if ($depth === 1) {
                    $moduleId = $currentModule->id;
                    $sectionSortByModule[$moduleId] = ($sectionSortByModule[$moduleId] ?? ((int)($currentModule->sections()->max('sort') ?? 0))) + 10;

                    $currentSection = LearningSection::query()->create([
                        'learning_module_id' => $moduleId,
                        'name' => $title,
                        'description' => $description,
                        'active' => true,
                        'sort' => $sectionSortByModule[$moduleId],
                    ]);
                    continue;
                }

                if (!$currentSection) {
                    $moduleId = $currentModule->id;
                    $sectionSortByModule[$moduleId] = ($sectionSortByModule[$moduleId] ?? ((int)($currentModule->sections()->max('sort') ?? 0))) + 10;

                    $currentSection = LearningSection::query()->create([
                        'learning_module_id' => $moduleId,
                        'name' => 'Allgemein',
                        'description' => '',
                        'active' => true,
                        'sort' => $sectionSortByModule[$moduleId],
                    ]);
                }

                $sectionId = $currentSection->id;
                $lectionSortBySection[$sectionId] = ($lectionSortBySection[$sectionId] ?? ((int)($currentSection->lections()->max('sort') ?? 0))) + 10;

                LearningLection::query()->create([
                    'learning_section_id' => $sectionId,
                    'name' => $title,
                    'description' => $description,
                    'content' => '',
                    'duration_minutes' => 0,
                    'active' => true,
                    'sort' => $lectionSortBySection[$sectionId],
                ]);
            }
        });

        $learningcourse->loadMissing(['cover', 'bodyImages', 'bundles', 'modules.cover', 'modules.sections']);
        $learningcourse->load(['modules.cover', 'modules.sections']);

        return response()->json([
            'message' => 'Import erfolgreich.',
            'learning_course' => $learningcourse,
        ]);
    }

    private function extractHeadings(string $content, string $format = 'auto'): array
    {
        $isHtml = $format === 'html' || ($format === 'auto' && preg_match('/<h[1-6][^>]*>/i', $content));
        $headings = $isHtml
            ? $this->extractHtmlHeadings($content)
            : $this->extractMarkdownHeadings($content);

        return array_values(array_filter($headings, fn ($item) => trim((string)$item['text']) !== ''));
    }

    private function extractMarkdownHeadings(string $content): array
    {
        $headings = [];
        $lines = preg_split('/\R/u', $content) ?: [];
        $currentIndex = null;

        foreach ($lines as $line) {
            if (preg_match('/^(#{1,6})\s+(.+?)\s*$/', $line, $match)) {
                $text = trim(strip_tags(html_entity_decode((string)$match[2], ENT_QUOTES | ENT_HTML5)));
                $headings[] = [
                    'level' => strlen((string)$match[1]),
                    'text' => $text,
                    'description' => '',
                ];
                $currentIndex = count($headings) - 1;
                continue;
            }

            if ($currentIndex === null) {
                continue;
            }

            $existing = (string)$headings[$currentIndex]['description'];
            $append = rtrim($line);
            $headings[$currentIndex]['description'] = $existing === ''
                ? $append
                : ($existing . "\n" . $append);
        }

        foreach ($headings as &$heading) {
            $heading['description'] = trim((string)$heading['description']);
        }

        return $headings;
    }

    private function extractHtmlHeadings(string $content): array
    {
        preg_match_all('/<h([1-6])[^>]*>(.*?)<\/h\1>/is', $content, $matches, PREG_OFFSET_CAPTURE);
        $headings = [];
        $items = $matches[0] ?? [];

        foreach ($items as $index => $fullMatch) {
            $rawHeading = (string)$fullMatch[0];
            $startPos = (int)$fullMatch[1];
            $endPos = $startPos + strlen($rawHeading);
            $nextStart = isset($items[$index + 1]) ? (int)$items[$index + 1][1] : strlen($content);

            $level = (int)($matches[1][$index][0] ?? 1);
            $titleRaw = (string)($matches[2][$index][0] ?? '');
            $descriptionRaw = substr($content, $endPos, max(0, $nextStart - $endPos));

            $text = trim(strip_tags(html_entity_decode($titleRaw, ENT_QUOTES | ENT_HTML5)));
            $description = trim(strip_tags(html_entity_decode($descriptionRaw, ENT_QUOTES | ENT_HTML5)));

            $headings[] = [
                'level' => $level,
                'text' => $text,
                'description' => $description,
            ];
        }

        return $headings;
    }
}
