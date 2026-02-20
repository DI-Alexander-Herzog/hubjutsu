import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';

export default function LearningSectionIndex() {
    return (
        <AuthenticatedLayout
            title="Learning Sections"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Sections' },
            ]}
        >
            <DataTable
                routemodel="learning_section"
                with={['module']}
                defaultSortField={[["sort", 1], ["name", 1]]}
                newRecord={{
                    name: '',
                    active: true,
                    sort: 0,
                }}
                columns={[
                    {
                        field: 'learning_module_id',
                        label: 'Module',
                        sortable: true,
                        filter: true,
                        frozen: true,
                        width: '240px',
                        editor: {
                            type: 'model',
                            model: 'learning_module',
                            labelField: 'name',
                        },
                        formatter: (row: any) => row.module?.name || '',
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
                        field: 'description',
                        label: 'Description',
                        sortable: true,
                        filter: true,
                        width: '340px',
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
