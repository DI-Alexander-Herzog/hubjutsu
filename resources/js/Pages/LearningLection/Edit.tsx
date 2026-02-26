import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';
import NeutralButton from '@/Components/NeutralButton';
import LearningLectionForm from './Form';

export default function LearningLectionEdit({ learning_lection }: { learning_lection: any }) {
    const section = learning_lection?.section;
    const module = section?.module;
    const course = module?.course;

    const sectionName = section?.name;
    const moduleName = module?.name;
    const courseName = course?.name;

    const courseEditUrl = course ? route('settings.learningcourses.edit', course) : route('settings.learningcourses.index');
    const moduleEditUrl = module ? `${courseEditUrl}?module=${module.id}` : courseEditUrl;
    const sectionEditUrl = section ? `${courseEditUrl}?module=${module?.id}&section=${section.id}` : moduleEditUrl;
    const [showStructureDetails, setShowStructureDetails] = useState(true);

    const mediaUrl = (media: any): string | null => {
        if (!media || typeof media !== 'object') return null;
        return media.thumbnail || media.url || media.original_url || media.path || null;
    };

    const courseCover = mediaUrl(course?.cover);
    const moduleCover = mediaUrl(module?.cover);

    return (
        <AuthenticatedLayout
            title="Learning Lection"
            breadcrumbs={[
                { label: 'Learning Courses', url: route('settings.learningcourses.index') },
                { label: courseName || 'Kurs', url: courseEditUrl },
                { label: moduleName || 'Modul', url: moduleEditUrl },
                { label: sectionName || 'Sektion', url: sectionEditUrl },
                { label: learning_lection?.name || 'Lection' },
            ]}
        >
            <div className="mt-2 mb-4">
                <div className="mx-auto max-w-7xl rounded-md border border-gray-200 dark:border-gray-700 bg-background-600 dark:bg-gray-900/60 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Kursstruktur</div>
                            <div className="mt-1 text-sm text-text-700 dark:text-gray-300">Kontext zur aktuellen Lektion</div>
                        </div>
                        <NeutralButton
                            size="small"
                            onClick={() => setShowStructureDetails((prev) => !prev)}
                            className="px-2 py-1 text-xs"
                        >
                            {showStructureDetails ? 'Details ausblenden' : 'Details anzeigen'}
                        </NeutralButton>
                    </div>

                    {showStructureDetails && (
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <a
                                href={courseEditUrl}
                                className="block rounded-md border border-gray-200 dark:border-gray-700 bg-background dark:bg-gray-800 p-3 hover:border-primary"
                            >
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Kurs</div>
                                <div className="flex items-start gap-3">
                                    {courseCover ? (
                                        <img src={courseCover} alt={courseName || 'Kurs'} className="h-16 w-16 rounded object-cover" />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-600 text-[10px] text-text-400 dark:text-gray-500">
                                            Kein Bild
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-text-900 dark:text-gray-100">{courseName || '-'}</div>
                                        {course?.description ? (
                                            <div className="mt-1 text-xs text-text-600 dark:text-gray-400">{course.description}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </a>

                            <a
                                href={moduleEditUrl}
                                className="block rounded-md border border-gray-200 dark:border-gray-700 bg-background dark:bg-gray-800 p-3 hover:border-primary"
                            >
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Modul</div>
                                <div className="flex items-start gap-3">
                                    {moduleCover ? (
                                        <img src={moduleCover} alt={moduleName || 'Modul'} className="h-16 w-16 rounded object-cover" />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-600 text-[10px] text-text-400 dark:text-gray-500">
                                            Kein Bild
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-text-900 dark:text-gray-100">{moduleName || '-'}</div>
                                        {module?.description ? (
                                            <div className="mt-1 text-xs text-text-600 dark:text-gray-400">{module.description}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </a>

                            <a
                                href={sectionEditUrl}
                                className="block rounded-md border border-gray-200 dark:border-gray-700 bg-background dark:bg-gray-800 p-3 hover:border-primary"
                            >
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Sektion</div>
                                <div className="text-sm font-medium text-text-900 dark:text-gray-100">{sectionName || '-'}</div>
                                {section?.description ? (
                                    <div className="mt-1 text-xs text-text-600 dark:text-gray-400">{section.description}</div>
                                ) : null}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <LearningLectionForm learning_lection={learning_lection} disabled={false} />
        </AuthenticatedLayout>
    );
}
