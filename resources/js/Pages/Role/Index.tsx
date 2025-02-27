import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@hubjutsu/Components/DataTable';
import { Head } from '@inertiajs/react';

export default function RoleIndex() {
    return (
        <AuthenticatedLayout
            header={"Role"}
        >
            <Head title="Role" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <DataTable routemodel='role' columns={[
                        {
                            field: 'name',
                            label: 'Name',
                            sortable: true,
                            filter: true

                        }
                    ]} >
                    </DataTable>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}