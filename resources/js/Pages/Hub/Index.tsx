import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { Head, router } from '@inertiajs/react';

export default function HubIndex() {
    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Hub</h2>}
        >
            <Head title="Hub" />

            <div className="">
                    <DataTable routemodel='hub' height="400px" columns={[
                        {
                            field: 'name',
                            label: 'Name',
                            sortable: true,
                            filter: true,
                            frozen: true,
                            width: '500px',
                            formatter: (row:any) => <a className="text-primary" href={route('admin.hubs.edit', row )}>{row.name}</a>
                        },
                        {
                            field: 'url',
                            label: 'URL',
                            sortable: true,
                            filter: true,
                            editor: 'text',
                            width: "300px"
                        },
                        {
                            field: 'primary',
                            label: 'Primary',
                            sortable: true,
                            filter: true,
                            editor: 'text',
                            width: "300px"
                        }
                    ]} >
                    </DataTable>
            </div>
        </AuthenticatedLayout>
    );
}