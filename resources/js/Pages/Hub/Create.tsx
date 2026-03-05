import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormContainer from '@/Components/FormContainer';
import Card from '@/Components/Layout/Card';

export default function HubCreate() {
    return (
        <AuthenticatedLayout
            title="Create Hub"
        >
            <FormContainer className="py-4">
                <Card>
                    <p className="text-text-900 dark:text-gray-100">IRGENDWELCHE SETTINGS!</p>
                </Card>
            </FormContainer>
        </AuthenticatedLayout>
    );
}
