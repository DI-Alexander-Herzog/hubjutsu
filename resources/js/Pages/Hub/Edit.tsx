import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HubForm from './Form';
import { CogIcon, FolderIcon } from '@heroicons/react/20/solid';


export default function HubEdit({ hubEntry }: { hubEntry?: any }) {
    return (
        <AuthenticatedLayout
            title="Hub"
            breadcrumbs={[
				{ label: 'Settings', url: route('settings.index'), icon:<CogIcon /> }, 
				{ label: 'Hubs', url: route('admin.hubs.index'), icon: <FolderIcon /> },
                { label: hubEntry ? hubEntry.name : 'New Hub' }
			]}
        >

            <HubForm hub={hubEntry} />
        </AuthenticatedLayout>
    );
}