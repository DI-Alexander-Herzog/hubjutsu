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
            title={"User"}
        >
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <DataTable routemodel='user' height="400px" columns={[
                        {
                            field: 'email',
                            label: 'Mail',
                            sortable: true,
                            filter: true,
                            frozen: true,
                            width: '500px',
                            formatter: (row:any) => <a className="text-primary" href={`mailto:${row.email}`}>{row.email}</a>
                        },
                        {
                            field: 'name',
                            label: 'name',
                            sortable: true,
                            filter: true,
                            editor: 'text',
                            width: "300px"
                        }
                    ]} >
                    </DataTable>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}