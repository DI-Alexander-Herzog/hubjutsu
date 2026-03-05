import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import SideCard from '@/Components/Layout/SideCard';
import CourseProgressBadge from '@/Components/Learning/CourseProgressBadge';
import ProgressCircle from '@/Components/Learning/ProgressCircle';
import NeutralButton from '@/Components/NeutralButton';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';

type LearningLection = {
    id: number;
    name: string;
    duration_minutes?: number | null;
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
    description?: string | null;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
    sections?: LearningSection[];
    progress?: {
        percent?: number;
        started?: boolean;
        completed?: boolean;
        total_lections?: number;
        completed_lections?: number;
        total_minutes?: number;
    };
};

type LearningBundle = {
    id: number;
    name: string;
};

type LearningCourse = {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
    bundles?: LearningBundle[];
    modules?: LearningModule[];
    progress?: {
        started?: boolean;
        status?: 'not_started' | 'started' | 'finished' | 'completed';
        progress_percent?: number;
    };
};

export default function LearningCourseFrontendShow({ course }: { course: LearningCourse }) {
    const { props } = usePage<PageProps>();
    const hubLogoUrl = props.hub?.logo?.thumbnail || null;
    const courseCoverUrl = course.cover?.thumbnail || course.cover?.url || hubLogoUrl;
    const bundles = course.bundles || [];
    const modules = course.modules || [];
    const progress = course.progress;

    const startCourse = () => {
        router.post(route('learning.courses.start', { learningcourse: course.slug }));
    };
    const resetCourse = () => {
        router.post(route('learning.courses.reset', { learningcourse: course.slug }));
    };

    return (
        <AuthenticatedLayout
            title={course.name}
            breadcrumbs={[
                { label: 'Learning', url: route('learning.courses.index') },
                { label: course.name },
            ]}
        >
            <Container size="medium" className="py-4" stack gap="md">
                <Card
                    imageUrl={courseCoverUrl}
                    imageAlt={course.name}
                    imagePosition="left"
                    imageWidthClassName="w-full md:w-80"
                    title={course.name}
                    subtitle={course.description || 'Keine Beschreibung vorhanden.'}
                >
                    <CourseProgressBadge
                        status={progress?.status}
                        progressPercent={progress?.progress_percent || 0}
                    />

                    {bundles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {bundles.map((bundle) => (
                                <span
                                    key={bundle.id}
                                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary dark:text-primary-300"
                                >
                                    {bundle.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {!progress?.started && (
                        <div>
                            <PrimaryButton onClick={startCourse}>Kurs starten</PrimaryButton>
                        </div>
                    )}
                    {progress?.started && (
                        <div>
                            <NeutralButton onClick={resetCourse}>Zuruecksetzen</NeutralButton>
                        </div>
                    )}
                </Card>

                {modules.length === 0 ? (
                    <Card>
                        <p className="text-sm text-text-500 dark:text-gray-400">
                            Dieser Kurs hat noch keine aktiven Module.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {modules.map((module) => {
                            const cover = module.cover?.thumbnail || module.cover?.url || courseCoverUrl || hubLogoUrl;
                            const sections = module.sections || [];
                            const lectionsCount = module.progress?.total_lections || sections.reduce((count, section) => count + (section.lections?.length || 0), 0);
                            const totalMinutes = module.progress?.total_minutes || 0;
                            const progressPercent = module.progress?.percent || 0;
                            const moduleStarted = module.progress?.started || false;
                            const moduleCompleted = module.progress?.completed || false;

                            return (
                                <SideCard
                                    key={module.id}
                                    href={route('learning.modules.show', {
                                        learningcourse: course.slug,
                                        learningmoduleslug: module.slug,
                                    })}
                                    imageUrl={cover}
                                    imageAlt={module.name}
                                    title={module.name}
                                    subtitle={`${lectionsCount} Lektionen | ${totalMinutes} Min.`}
                                    right={(
                                        <ProgressCircle
                                            percent={progressPercent}
                                            started={moduleStarted}
                                            completed={moduleCompleted}
                                        />
                                    )}
                                />
                            );
                        })}
                    </div>
                )}

                <div>
                    <Link
                        href={route('learning.courses.index')}
                        className="text-sm text-primary hover:underline dark:text-primary-300"
                    >
                        Zurueck zur Kursuebersicht
                    </Link>
                </div>
            </Container>
        </AuthenticatedLayout>
    );
}
