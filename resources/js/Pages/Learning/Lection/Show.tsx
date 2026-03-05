import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import SideCard from '@/Components/Layout/SideCard';
import Checkbox from '@/Components/Checkbox';
import IconLibrary from '@/Components/IconLibrary';
import ProgressCircle from '@/Components/Learning/ProgressCircle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import classNames from 'classnames';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';

type LearningCourse = {
    id: number;
    slug: string;
    name: string;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
};

type LearningLection = {
    id: number;
    name: string;
    description?: string | null;
    content?: string | null;
    duration_minutes?: number | null;
    image?: { thumbnail?: string | null; url?: string | null } | null;
    video?: { id: number; thumbnail?: string | null; url?: string | null } | null;
    progress?: {
        completed?: boolean;
    };
};

type LearningSection = {
    id: number;
    name: string;
    lections?: LearningLection[];
};

type LearningModule = {
    id: number;
    slug: string;
    name: string;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
    sections?: LearningSection[];
    progress?: {
        percent?: number;
        started?: boolean;
        completed?: boolean;
        total_lections?: number;
    };
};

export default function LearningLectionFrontendShow({
    course,
    module,
    lection,
}: {
    course: LearningCourse;
    module: LearningModule;
    lection: LearningLection;
}) {
    const { props } = usePage<PageProps>();
    const hubLogoUrl = props.hub?.logo?.thumbnail || null;
    const courseCoverUrl = course.cover?.thumbnail || course.cover?.url || hubLogoUrl;
    const sections = module.sections || [];
    const currentSectionIndex = sections.findIndex((section) => (section.lections || []).some((entry) => entry.id === lection.id));
    const currentSection = currentSectionIndex >= 0 ? sections[currentSectionIndex] : null;
    const sectionLections = currentSection?.lections || [];
    const nextSection = currentSectionIndex >= 0 ? (sections[currentSectionIndex + 1] || null) : null;
    const firstLectionOfNextSection = nextSection?.lections?.[0] || null;
    const moduleCoverUrl = module.cover?.thumbnail || module.cover?.url || courseCoverUrl || hubLogoUrl;

    return (
        <AuthenticatedLayout
            title={lection.name}
            breadcrumbs={[
                { label: course.name, url: route('learning.courses.show', { learningcourse: course.slug }) },
                { label: module.name, url: route('learning.modules.show', { learningcourse: course.slug, learningmoduleslug: module.slug }) },
                ...(currentSection ? [{
                    label: currentSection.name,
                    url: `${route('learning.modules.show', {
                        learningcourse: course.slug,
                        learningmoduleslug: module.slug,
                    })}#section-${currentSection.id}`,
                }] : []),
                { label: lection.name },
            ]}
        >
            <Container size="large" className="py-4" stack gap="md">
                <SideCard
                    imageUrl={moduleCoverUrl}
                    imageAlt={module.name}
                    title={module.name}
                    subtitle={lection.name}
                    right={(
                        <ProgressCircle
                            percent={module.progress?.percent || 0}
                            started={module.progress?.started || false}
                            completed={module.progress?.completed || false}
                        />
                    )}
                />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card>
                            <h2 className="text-4xl font-semibold text-text-900 dark:text-gray-100">
                                {lection.name}
                            </h2>

                            {lection.video?.id ? (
                                <div className="overflow-hidden rounded-xl">
                                    <video
                                        controls
                                        className="h-auto w-full"
                                        poster={lection.image?.thumbnail || lection.image?.url || moduleCoverUrl || courseCoverUrl || hubLogoUrl || undefined}
                                        src={route('media.file', { media: lection.video.id })}
                                    />
                                </div>
                            ) : (lection.image?.thumbnail || lection.image?.url || moduleCoverUrl || courseCoverUrl || hubLogoUrl) ? (
                                <div className="overflow-hidden rounded-xl">
                                    <img
                                        src={lection.image?.thumbnail || lection.image?.url || moduleCoverUrl || courseCoverUrl || hubLogoUrl || ''}
                                        alt={lection.name}
                                        className="h-auto w-full object-cover"
                                    />
                                </div>
                            ) : null}

                            {lection.description && (
                                <p className="text-lg text-text-700 dark:text-gray-300">
                                    {lection.description}
                                </p>
                            )}

                            {lection.content && (
                                /<\w+[^>]*>/.test(lection.content) ? (
                                    <div
                                        className="prose max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: lection.content }}
                                    />
                                ) : (
                                    <p className="whitespace-pre-wrap text-base text-text-700 dark:text-gray-300">
                                        {lection.content}
                                    </p>
                                )
                            )}
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="truncate text-2xl font-semibold text-text-900 dark:text-gray-100">
                                        {module.name}
                                    </h3>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">
                                        {sectionLections.length} Lektionen
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {sectionLections.map((entry) => {
                                        const active = entry.id === lection.id;

                                        return (
                                            <SideCard
                                                key={entry.id}
                                                href={route('learning.lections.show', {
                                                    learningcourse: course.slug,
                                                    learningmoduleslug: module.slug,
                                                    learninglection: entry.id,
                                                })}
                                                className={classNames(
                                                    active
                                                        ? 'bg-background-600 dark:bg-gray-700/60'
                                                        : undefined
                                                )}
                                                imageUrl={entry.image?.thumbnail || entry.image?.url || moduleCoverUrl}
                                                fallbackImageUrl={moduleCoverUrl || courseCoverUrl || hubLogoUrl}
                                                imageAlt={entry.name}
                                                title={entry.name}
                                                right={(
                                                    <Checkbox
                                                        checked={Boolean(entry.progress?.completed)}
                                                        disabled
                                                        readOnly
                                                        className="h-6 w-6 !rounded-md"
                                                    />
                                                )}
                                            />
                                        );
                                    })}
                                </div>

                                {firstLectionOfNextSection ? (
                                    <Link
                                        href={route('learning.lections.show', {
                                            learningcourse: course.slug,
                                            learningmoduleslug: module.slug,
                                            learninglection: firstLectionOfNextSection.id,
                                        })}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-background-600 px-3 py-2 text-sm font-semibold text-text-700 hover:bg-background-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                    >
                                        <span>Naechste Sektion</span>
                                        <IconLibrary name="chevron-right" size="sm" />
                                    </Link>
                                ) : null}
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>
        </AuthenticatedLayout>
    );
}
