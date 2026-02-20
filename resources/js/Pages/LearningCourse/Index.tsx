import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';

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
                with={['bundles']}
                defaultSortField={[["sort", 1], ["name", 1]]}
                newRecord={{
                    name: '',
                    active: true,
                    sort: 0,
                }}
                columns={[
                    {
                        field: 'name',
                        label: 'Name',
                        sortable: true,
                        filter: true,
                        frozen: true,
                        width: '220px',
                        editor: 'text',
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
                        field: 'slug',
                        label: 'Slug',
                        sortable: true,
                        filter: true,
                        width: '220px',
                        editor: 'text',
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
                    {
                        field: 'sort',
                        label: 'Sort',
                        sortable: true,
                        filter: true,
                        width: '100px',
                        editor: { type: 'number', min: 0 },
                    },
                ]}
            />
        </AuthenticatedLayout>
    );
}
