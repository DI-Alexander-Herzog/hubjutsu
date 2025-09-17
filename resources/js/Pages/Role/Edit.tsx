import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleForm from './Form';
import { Models } from '@/types/models';
import { CogIcon,ShieldCheckIcon } from '@heroicons/react/20/solid';

export default function RoleEdit({ role, permissions } : { role: Models.Role, permissions:any }) {
    return (
        <AuthenticatedLayout
            title="Edit Role"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index'), icon: <CogIcon /> },
                { label: 'Roles', url: route('admin.roles.index'), icon: <ShieldCheckIcon />  },
                { label: `${role.name}`, url: route('admin.roles.edit', { role: role.id }) }
            ]}
        >

            <RoleForm role={ role } permissions={ permissions }  disabled={false}/>
        </AuthenticatedLayout>
    );
}