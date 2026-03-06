import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import SideCard from '@/Components/Layout/SideCard';
import Checkbox from '@/Components/Checkbox';
import IconLibrary from '@/Components/IconLibrary';
import HtmlEditorOutput from '@/Components/HtmlEditorOutput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import classNames from 'classnames';
import { PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import { useState } from 'react';
import { Models } from '@/types/models';

type LearningCourse = Models.LearningCourse;

type LearningLection = Omit<Models.LearningLection, 'attachments'> & {
    attachments?: Models.Media[] | null;
    progress?: {
        completed?: boolean;
    };
};

type LearningSection = Omit<Models.LearningSection, 'lections'> & {
    lections?: LearningLection[];
};

type LearningModule = Omit<Models.LearningModule, 'sections'> & {
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
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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
    const lectionCompleted = Boolean(lection.progress?.completed);
    const attachments = lection.attachments || [];
    const shortDescription = lection.description
        ? (lection.description.length > 220 ? `${lection.description.slice(0, 220)}...` : lection.description)
        : null;

    const getAttachmentIcon = (mimetype?: string | null): string => {
        const normalized = (mimetype || '').toLowerCase();
        if (normalized.startsWith('image/')) return 'photo';
        if (normalized.startsWith('video/')) return 'film';
        if (normalized.startsWith('audio/')) return 'musical-note';
        if (normalized.includes('pdf')) return 'document-text';
        if (normalized.includes('word') || normalized.includes('officedocument.wordprocessingml')) return 'document-text';
        if (normalized.includes('excel') || normalized.includes('spreadsheetml')) return 'table-cells';
        if (normalized.includes('powerpoint') || normalized.includes('presentationml')) return 'presentation-chart-bar';
        if (normalized.includes('zip') || normalized.includes('compressed')) return 'archive-box';
        return 'paper-clip';
    };

    const isImageAttachment = (mimetype?: string | null): boolean => {
        return (mimetype || '').toLowerCase().startsWith('image/');
    };

    const completeLection = () => {
        router.post(route('learning.lections.complete', {
            learningcourse: course.slug,
            learningmoduleslug: module.slug,
            learninglection: lection.id,
        }));
    };

    return (
        <AuthenticatedLayout
            title={lection.name}
            breadcrumbs={[
                { label: 'Learning', url: route('learning.courses.index') },
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <SideCard
                            key={`lection-header-${lection.id}`}
                            imageUrl={moduleCoverUrl}
                            imageAlt={module.name}
                            title={module.name}
                            subtitle={lection.name}
                            progressPercent={module.progress?.percent || 0}
                        />

                        <Card key={`lection-content-${lection.id}`}>
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
                            ) : (lection.image?.thumbnail || lection.image?.url ) ? (
                                <div className="overflow-hidden rounded-xl">
                                    <img
                                        src={lection.image?.thumbnail || lection.image?.url || ''}
                                        alt={lection.name}
                                        className="max-h-[60vh] w-full object-contain"
                                    />
                                </div>
                            ) : null}

                            {shortDescription && (
                                <p className="text-sm text-text-600 dark:text-gray-300">
                                    {shortDescription}
                                </p>
                            )}

                            {lection.content && (
                                <HtmlEditorOutput
                                    html={lection.content}
                                    onImageClick={(src: string) => setLightboxSrc(src)}
                                />
                            )}

                            {attachments.length > 0 && (
                                <div className="max-w-[450px] space-y-2 border-t border-background-700 pt-4 pr-2 dark:border-gray-700 sm:pr-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">
                                        Dokumente
                                    </h3>
                                    <div className="space-y-2">
                                        {attachments.map((attachment) => {
                                            const filename = attachment.filename?.split('/').pop() || '';
                                            const label = attachment.name || filename || `Dokument ${attachment.id}`;
                                            const href = attachment.url || route('media.file', { media: attachment.id });
                                            const description = attachment.description?.trim() || null;
                                            const previewUrl = attachment.thumbnail || (isImageAttachment(attachment.mimetype) ? href : null);

                                            return (
                                                <a
                                                    key={attachment.id}
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 rounded-lg border border-background-700 px-2.5 py-2 text-text-700 transition-colors hover:bg-background-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700/70"
                                                >
                                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-background-600 dark:bg-gray-700">
                                                        {previewUrl ? (
                                                            <img
                                                                src={previewUrl}
                                                                alt={label}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-tertiary dark:text-tertiary">
                                                                <IconLibrary name={getAttachmentIcon(attachment.mimetype)} size="lg" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-text-900 dark:text-gray-100">
                                                            {label}
                                                        </p>
                                                        {description && (
                                                            <p className="truncate text-xs text-text-600 dark:text-gray-300">
                                                                {description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="shrink-0 text-text-500 dark:text-gray-300">
                                                        <IconLibrary name="arrow-top-right-on-square" size="sm" />
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end border-t border-background-700 pt-4 dark:border-gray-700">
                                <PrimaryButton onClick={completeLection}>
                                    {lectionCompleted ? 'Weiter' : 'Lektion abschliessen'}
                                </PrimaryButton>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="space-y-3">
                            <Card key={`lection-sidebar-section-${lection.id}`}>
                                <h3 className="truncate text-2xl font-semibold text-text-900 dark:text-gray-100">
                                   {currentSection?.name || '-'}
                                </h3>
                                <p className="truncate text-base font-medium text-text-700 dark:text-gray-300">
                                    {currentSection?.description || '-'}
                                </p>
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">
                                    {sectionLections.length} Lektionen
                                </p>
                            </Card>

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
                                            imageContainerClassName="w-[15%] min-w-[86px]"
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
                    </div>
                </div>
            </Container>

            {lightboxSrc ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setLightboxSrc(null)}
                >
                    <img
                        src={lightboxSrc}
                        alt="content-image-preview"
                        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            ) : null}
        </AuthenticatedLayout>
    );
}
