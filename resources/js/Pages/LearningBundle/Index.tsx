import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { DataTableFormatter } from '@/Components/DataTableFormatter';

export default function LearningBundleIndex() {
    return (
        <AuthenticatedLayout
            title="Learning Bundles"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Bundles' },
            ]}
        >
            <DataTable
                routemodel="learning_bundle"
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
                        width: '240px',
                        editor: 'text',
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
                        width: '360px',
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
