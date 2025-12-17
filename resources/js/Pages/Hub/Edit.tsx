import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HubForm from './Form';
import { CogIcon, FolderIcon } from '@heroicons/react/20/solid';
import RoleAssignmentSection from '@/Components/RoleAssignmentModal';
import FormContainer from '@hubjutsu/Components/FormContainer';

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

            {hubEntry?.id && (
                <FormContainer>
                <RoleAssignmentSection
                    scope={{
                        type: hubEntry?.morph_class ?? 'App\\Models\\Hub',
                        id: hubEntry.id,
                        label: hubEntry.name,
                    }}
                />
                </FormContainer>
            )}
        </AuthenticatedLayout>
    );
}
