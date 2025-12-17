import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HubForm from './Form';
import { CogIcon, FolderIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import FormContainer from '@hubjutsu/Components/FormContainer';
import FormSection from '@hubjutsu/Components/FormSection';
import PrimaryButton from '@hubjutsu/Components/PrimaryButton';
import RoleAssignmentModal from '@hubjutsu/Components/RoleAssignmentModal';


export default function HubEdit({ hubEntry }: { hubEntry?: any }) {

    const [showRoles, setShowRoles] = useState(false);
    const scopeType = hubEntry?.morph_class ?? 'App\\Models\\Hub';


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
                    <FormSection title="Rollen" subtitle="Verwalte Rollen für diesen Hub">
                        <p className="text-sm text-gray-500 mb-3">
                            Rollen, die hier vergeben werden, greifen nur für diesen Hub. Über das Rollen-Modal siehst du auch geerbte Rollen.
                        </p>
                        <PrimaryButton onClick={() => setShowRoles(true)}>
                            Rollen verwalten
                        </PrimaryButton>
                    </FormSection>
                </FormContainer>
                )}
            {hubEntry?.id && (
                <RoleAssignmentModal
                    open={showRoles}
                    onClose={() => setShowRoles(false)}
                    scope={{
                        type: scopeType,
                        id: hubEntry.id,
                        label: hubEntry.name,
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}
