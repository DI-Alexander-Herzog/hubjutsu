import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/Layout/Card';
import Container from '@/Components/Layout/Container';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

type CourseEntry = {
    id: number;
    name: string;
    description?: string | null;
    modules_count?: number;
    cover?: { thumbnail?: string | null; url?: string | null } | null;
    bundles?: Array<{ id: number; name: string }>;
};

export default function LearningCourseFrontendIndex({ courses = [] }: { courses?: CourseEntry[] }) {
    const { props } = usePage<PageProps>();
    const hubLogoUrl = props.hub?.logo?.thumbnail || null;

    return (
        <AuthenticatedLayout
            title="Learning"
            breadcrumbs={[
                { label: 'Dashboard', url: route('dashboard') },
                { label: 'Learning' },
            ]}
        >
            <Container size="medium" className="space-y-4 py-4">
                <Card
                    title="Meine Kurse"
                    subtitle="Alle Kurse, auf die du ueber deine Bundle-Zuweisungen Zugriff hast."
                    titleClassName="text-2xl"
                    className="overflow-visible"
                />

                {courses.length === 0 ? (
                    <Card>
                        <p className="text-sm text-text-500 dark:text-gray-400">
                            Aktuell sind keine Kurse fuer dich freigeschaltet.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course) => {
                            const coverUrl = course.cover?.thumbnail || course.cover?.url || hubLogoUrl;
                            const bundles = course.bundles || [];

                            return (
                                <Card
                                    key={course.id}
                                    imageUrl={coverUrl}
                                    imageAlt={course.name}
                                    title={course.name}
                                    subtitle={course.description || 'Keine Beschreibung vorhanden.'}
                                >
                                    <div className="text-xs text-text-500 dark:text-gray-400">
                                        <span>Module: {course.modules_count || 0}</span>
                                    </div>

                                    {bundles.length > 0 ? (
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
                                    ) : (
                                        <p className="text-xs text-text-500 dark:text-gray-400">
                                            Kein Bundle zugeordnet.
                                        </p>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </Container>
        </AuthenticatedLayout>
    );
}
