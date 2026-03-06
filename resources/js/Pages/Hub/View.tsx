import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Models } from '@/types/models';
import HubForm from './Form';
import RoleAssignmentSection from '@/Components/RoleAssignmentModal';
import IntegrationServiceSection from '@/Components/IntegrationServiceSection';

export default function HubView({ hubEntry, roleOptions }: { hubEntry: Models.Hub; roleOptions?: [string, string][] }) {
    return (
        <AuthenticatedLayout
            title="Hub"
        >
            <HubForm disabled={true} hub={hubEntry} roleOptions={roleOptions} />

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

            {hubEntry?.id && (
                <IntegrationServiceSection
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
