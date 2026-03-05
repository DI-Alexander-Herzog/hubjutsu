import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import SideCard from '@/Components/Layout/SideCard';
import Checkbox from '@/Components/Checkbox';
import IconLibrary from '@/Components/IconLibrary';
import ProgressCircle from '@/Components/Learning/ProgressCircle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import classNames from 'classnames';
import { usePage } from '@inertiajs/react';

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
    duration_minutes?: number | null;
    image?: { thumbnail?: string | null; url?: string | null } | null;
    progress?: {
        started?: boolean;
        completed?: boolean;
    };
};

type LearningSection = {
    id: number;
    name: string;
    description?: string | null;
    lections?: LearningLection[];
};

type LearningModule = {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
    sections?: LearningSection[];
    progress?: {
        percent?: number;
        started?: boolean;
        completed?: boolean;
        total_lections?: number;
        total_minutes?: number;
    };
};

export default function LearningModuleFrontendShow({
    course,
    module,
}: {
    course: LearningCourse;
    module: LearningModule;
}) {
    const { props } = usePage<PageProps>();
    const hubLogoUrl = props.hub?.logo?.thumbnail || null;
    const courseCoverUrl = course.cover?.thumbnail || course.cover?.url || hubLogoUrl;
    const sections = module.sections || [];
    const lectionsCount = module.progress?.total_lections || sections.reduce((count, section) => count + (section.lections?.length || 0), 0);
    const totalMinutes = module.progress?.total_minutes || 0;
    const cover = module.cover?.thumbnail || module.cover?.url || courseCoverUrl || hubLogoUrl;

    return (
        <AuthenticatedLayout
            title={module.name}
            breadcrumbs={[
                { label: 'Learning', url: route('learning.courses.index') },
                { label: course.name, url: route('learning.courses.show', { learningcourse: course.slug }) },
                { label: module.name },
            ]}
        >
            <Container size="medium" className="py-4" stack gap="md">
                <SideCard
                    imageUrl={cover}
                    imageHref={sections[0] ? `#section-${sections[0].id}` : undefined}
                    imageAlt={module.name}
                    title={module.name}
                    subtitle={`${lectionsCount} Lektionen | ${totalMinutes} Minuten`}
                    right={(
                        <ProgressCircle
                            percent={module.progress?.percent || 0}
                            started={module.progress?.started || false}
                            completed={module.progress?.completed || false}
                        />
                    )}
                />

                {sections.map((section) => {
                    const sectionLections = section.lections || [];
                    const sectionMinutes = sectionLections.reduce((sum, lection) => sum + Number(lection.duration_minutes || 0), 0);
                    const completedInSection = sectionLections.filter((lection) => lection.progress?.completed).length;
                    const startedInSection = sectionLections.filter((lection) => lection.progress?.started).length;
                    const sectionState = sectionLections.length > 0 && completedInSection === sectionLections.length
                        ? 'done'
                        : startedInSection > 0
                            ? 'progress'
                            : 'new';

                    return (
                        <div key={section.id} id={`section-${section.id}`} className="scroll-mt-24">
                            <Card>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={classNames(
                                                'mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full',
                                                sectionState === 'done'
                                                    ? 'bg-primary/15 text-primary'
                                                    : sectionState === 'progress'
                                                        ? 'bg-secondary/15 text-secondary'
                                                        : 'bg-background-600 text-text-500 dark:bg-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            <IconLibrary name="book-open" size="sm" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-2xl font-semibold text-text-900 dark:text-gray-100">
                                                {section.name}
                                            </h2>
                                            <p className="text-sm text-text-500 dark:text-gray-400">
                                                {section.description || ''}
                                            </p>
                                            <p className="text-sm text-text-500 dark:text-gray-400">
                                                {sectionMinutes} Minuten
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {sectionLections.map((lection) => (
                                            <SideCard
                                                key={lection.id}
                                                href={route('learning.lections.show', {
                                                    learningcourse: course.slug,
                                                    learningmoduleslug: module.slug,
                                                    learninglection: lection.id,
                                                })}
                                                imageUrl={lection.image?.thumbnail || lection.image?.url || cover || courseCoverUrl || hubLogoUrl}
                                                fallbackImageUrl={courseCoverUrl || hubLogoUrl}
                                                imageAlt={lection.name}
                                                title={lection.name}
                                                subtitle={`${lection.duration_minutes || 0} Minuten`}
                                                right={(
                                                    <Checkbox
                                                        checked={Boolean(lection.progress?.completed)}
                                                        disabled
                                                        readOnly
                                                        className="h-6 w-6 !rounded-md"
                                                    />
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </Container>
        </AuthenticatedLayout>
    );
}
