import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from '@/Components/DataTable';
import { Head } from '@inertiajs/react';
import InputText from '@hubjutsu/Components/InputText';

const textEditor = (options:any) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback(e.target.value)} />;
};

export default function RoleIndex() {
    return (
        <AuthenticatedLayout
            header={"User"}
        >
            <Head title="User" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <DataTable routes='user' columns={[
                            {
                                field: 'email',
                                label: 'Mail',
                                sortable: true,
                                filter: true,
                                frozen: true,
                                formatter: (row:any) => <a className="text-primary" href={`mailto:${row.email}`}>{row.email}</a>
                            },
                            {
                                field: 'name',
                                label: 'name',
                                sortable: true,
                                filter: true,
                                editor: 'text'        
                            },
                        ]} >
                        </DataTable>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}