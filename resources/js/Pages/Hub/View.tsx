import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Models } from '@/types/models';
import HubForm from './Form';

export default function HubView({ hubEntry }: { hubEntry: Models.Hub }) {
    return (
        <AuthenticatedLayout
            title="Hub"
        >
            <HubForm disabled={true} hub={hubEntry} />
        </AuthenticatedLayout>
    );
}