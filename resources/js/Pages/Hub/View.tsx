import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Models } from '@/types/models';
import HubForm from './Form';
import DataTable from '@/Components/DataTable';

export default function HubView({ hubEntry }: { hubEntry: Models.Hub }) {
    return (
        <AuthenticatedLayout
            title="Hub"
        >
            <HubForm disabled={true} hub={hubEntry} />


            <DataTable
                routemodel="user_hub_role"
                newRecord={{
                    hub_id: hubEntry.id
                }}
                with={['user', 'role']}
                columns={[
                    {
                        field: "user_id",
                        label: "User",
                        sortable: true,
                        filter: true,
                        width: "500px",
                        editor: "text",
                    },
                    {
                        field: "role_id",
                        label: "Role",
                        sortable: true,
                        filter: true,
                        width: "500px",
                        editor: "text",
                    }
                ]}
            ></DataTable>
        </AuthenticatedLayout>
    );
}