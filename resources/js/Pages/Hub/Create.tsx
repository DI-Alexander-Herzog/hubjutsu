import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HubForm from './Form';
import { CogIcon, FolderIcon } from '@heroicons/react/20/solid';

export default function HubCreate({ hubEntry, roleOptions }: { hubEntry?: any; roleOptions?: [string, string][] }) {
    return (
        <AuthenticatedLayout
            title="Create Hub"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index'), icon:<CogIcon /> },
                { label: 'Hubs', url: route('admin.hubs.index'), icon: <FolderIcon /> },
                { label: 'New Hub' }
            ]}
        >
            <HubForm hub={hubEntry} roleOptions={roleOptions} />
        </AuthenticatedLayout>
    );
}
