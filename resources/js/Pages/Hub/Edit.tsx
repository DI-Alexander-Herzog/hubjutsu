import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HubForm from './Form';


export default function HubEdit({ hubEntry }: { hubEntry?: any }) {
    return (
        <AuthenticatedLayout
            title="Hub"
        >

            <HubForm hub={hubEntry} />
        </AuthenticatedLayout>
    );
}