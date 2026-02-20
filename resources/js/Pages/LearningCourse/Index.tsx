import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';
import DataTableLink from '@/Components/DataTableLink';

export default function LearningCourseIndex() {
    return (
        <AuthenticatedLayout
            title="Learning Courses"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Courses' },
            ]}
        >
            <DataTable
                routemodel="learning_course"
                with={['cover', 'bundles']}
                defaultSortField={[["name", 1]]}
                newRecord={{
                    name: '',
                    active: true,
                }}
                columns={[
                    {
                        field: 'cover',
                        label: 'Cover',
                        sortable: false,
                        filter: false,
                        width: '100px',
                        editor: { type: 'media', accept: 'image/*' },
                        formatter: DataTableFormatter.media,
                    },
                    {
                        field: 'name',
                        label: 'Name',
                        sortable: true,
                        filter: true,
                        frozen: true,
                        width: '220px',
                        editor: 'text',
                        formatter: (row: any) => (
                            <DataTableLink href={route('settings.learningcourses.show', row)}>
                                {row.name}
                            </DataTableLink>
                        ),
                    },
                    {
                        field: 'bundles',
                        label: 'Bundles',
                        sortable: false,
                        filter: false,
                        width: '260px',
                        formatter: (row: any) =>
                            (row.bundles || []).map((bundle: any) => bundle.name).join(', '),
                    },
                    {
                        field: 'description',
                        label: 'Description',
                        sortable: true,
                        filter: true,
                        width: '320px',
                        editor: 'textarea',
                    },
                    {
                        field: 'active',
                        label: 'Active',
                        sortable: true,
                        filter: true,
                        width: '100px',
                        editor: 'boolean',
                        formatter: DataTableFormatter.boolean,
                    },
                ]}
            />
        </AuthenticatedLayout>
    );
}
