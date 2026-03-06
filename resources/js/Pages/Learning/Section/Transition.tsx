import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import SideCard from '@/Components/Layout/SideCard';
import IconLibrary from '@/Components/IconLibrary';
import NeutralButton from '@/Components/NeutralButton';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Models } from '@/types/models';

type LearningLection = Models.LearningLection;

type LearningSection = Omit<Models.LearningSection, 'lections'> & {
    lections?: LearningLection[];
};

type LearningModule = Models.LearningModule;
type LearningCourse = Models.LearningCourse;

export default function LearningSectionTransition({
    course,
    module,
    section,
    next_section,
    next_module,
}: {
    course: LearningCourse;
    module: LearningModule;
    section: LearningSection;
    next_section?: LearningSection | null;
    next_module?: LearningModule | null;
}) {
    const { props } = usePage<PageProps>();
    const hubLogoUrl = props.hub?.logo?.thumbnail || null;

    const nextSection = next_section || null;
    const nextModule = next_module || null;
    const nextSectionFirstLection = nextSection?.lections?.[0] || null;

    const nextTargetUrl = nextSectionFirstLection
        ? route('learning.lections.show', {
            learningcourse: course.slug,
            learningmoduleslug: module.slug,
            learninglection: nextSectionFirstLection.id,
        })
        : nextModule
            ? route('learning.modules.show', {
                learningcourse: course.slug,
                learningmoduleslug: nextModule.slug,
            })
            : route('learning.courses.show', { learningcourse: course.slug });

    const nextTargetLabel = nextSection
        ? 'Mit naechster Sektion fortfahren'
        : nextModule
            ? 'Mit naechstem Modul fortfahren'
            : 'Zur Kursansicht';

    const nextTitle = nextSection?.name || nextModule?.name || course.name;
    const nextDescription = nextSection?.description || (nextModule
        ? 'Die naechste Sektion ist abgeschlossen. Weiter mit dem naechsten Modul.'
        : 'Alle Sektionen im aktuellen Modul sind abgeschlossen.');

    const nextImage = nextSectionFirstLection?.image?.thumbnail
        || nextSectionFirstLection?.image?.url
        || nextModule?.cover?.thumbnail
        || nextModule?.cover?.url
        || module.cover?.thumbnail
        || module.cover?.url
        || course.cover?.thumbnail
        || course.cover?.url
        || hubLogoUrl;

    return (
        <AuthenticatedLayout
            title="Ende der Sektion"
            breadcrumbs={[
                { label: course.name, url: route('learning.courses.show', { learningcourse: course.slug }) },
                { label: module.name, url: route('learning.modules.show', { learningcourse: course.slug, learningmoduleslug: module.slug }) },
                { label: section.name },
                { label: 'Ende der Sektion' },
            ]}
        >
            <Container size="medium" className="py-6" stack gap="md">
                <Card>
                    <div className="space-y-6 text-center">
                        <div className="mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary text-onprimary">
                            <IconLibrary name="book-open" size="2xl" />
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-500 dark:text-gray-400">
                                {module.name}
                            </p>
                            <h1 className="text-4xl font-semibold text-text-900 dark:text-gray-100">
                                Ende der Sektion
                            </h1>
                        </div>

                        <div className="mx-auto w-full max-w-3xl">
                            <SideCard
                                imageUrl={nextImage || undefined}
                                imageAlt={nextTitle}
                                title={nextTitle}
                                subtitle={nextDescription || ''}
                                right={(
                                    <span className="rounded-full bg-background-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-text-600 dark:bg-gray-700 dark:text-gray-200">
                                        {nextSection ? 'Naechste Sektion' : (nextModule ? 'Naechstes Modul' : 'Weiter')}
                                    </span>
                                )}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link href={route('learning.modules.show', { learningcourse: course.slug, learningmoduleslug: module.slug })}>
                                <NeutralButton type="button" className="gap-2">
                                    <IconLibrary name="chevron-left" size="sm" />
                                    Zurueck zur Moduluebersicht
                                </NeutralButton>
                            </Link>

                            <Link href={nextTargetUrl}>
                                <PrimaryButton type="button" className="gap-2">
                                    {nextTargetLabel}
                                    <IconLibrary name="chevron-right" size="sm" />
                                </PrimaryButton>
                            </Link>
                        </div>
                    </div>
                </Card>
            </Container>
        </AuthenticatedLayout>
    );
}
