import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Models } from '@/types/models';
import HubForm from './Form';
import RoleAssignmentSection from '@/Components/RoleAssignmentModal';

export default function HubView({ hubEntry }: { hubEntry: Models.Hub }) {
    return (
        <AuthenticatedLayout
            title="Hub"
        >
            <HubForm disabled={true} hub={hubEntry} />

            {hubEntry?.id && (
                <RoleAssignmentSection
                    scope={{
                        type: hubEntry?.morph_class ?? 'App\\Models\\Hub',
                        id: hubEntry.id,
                        label: hubEntry.name,
                    }}
                    disabled
                />
            )}
        </AuthenticatedLayout>
    );
}
