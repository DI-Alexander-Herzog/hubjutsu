import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';

export default function LearningLectionIndex() {
    return (
        <AuthenticatedLayout
            title="Learning Lections"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Lections' },
            ]}
        >
            <DataTable
                routemodel="learning_lection"
                with={['section']}
                defaultSortField={[["sort", 1], ["name", 1]]}
                newRecord={{
                    name: '',
                    active: true,
                    sort: 0,
                }}
                columns={[
                    {
                        field: 'learning_section_id',
                        label: 'Section',
                        sortable: true,
                        filter: true,
                        frozen: true,
                        width: '240px',
                        editor: {
                            type: 'model',
                            model: 'learning_section',
                            labelField: 'name',
                        },
                        formatter: (row: any) => row.section?.name || '',
                    },
                    {
                        field: 'name',
                        label: 'Name',
                        sortable: true,
                        filter: true,
                        width: '240px',
                        editor: 'text',
                    },
                    {
                        field: 'duration_minutes',
                        label: 'Duration (min)',
                        sortable: true,
                        filter: true,
                        width: '130px',
                        editor: { type: 'number', min: 0 },
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
                        field: 'content',
                        label: 'Content',
                        sortable: true,
                        filter: true,
                        width: '420px',
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
