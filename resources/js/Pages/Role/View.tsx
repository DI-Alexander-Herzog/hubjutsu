import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Models } from '@/types/models';
import { Head } from '@inertiajs/react';
import RoleForm from './Form';
import { CogIcon,ShieldCheckIcon } from '@heroicons/react/20/solid';

export default function RoleView({ role, permissions } : { role: Models.Role, permissions: any }) {
    return (
        <AuthenticatedLayout
            title="Edit Role"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index'), icon: <CogIcon />  },
                { label: 'Roles', url: route('admin.roles.index'), icon: <ShieldCheckIcon />  },
                { label: `${role.name}`, url: route('admin.roles.edit', { role: role.id }) }
            ]}
        >

            <RoleForm role={ role } permissions={ permissions }  disabled={true}/>
        </AuthenticatedLayout>
    );
}