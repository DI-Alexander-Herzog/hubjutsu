import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormContainer from '@/Components/FormContainer';
import Card from '@/Components/Layout/Card';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            title="Dashboard"
        >
            <FormContainer className="py-4">
                <Card>
                    <p className="text-text-900 dark:text-gray-100">You're logged in!</p>
                </Card>
            </FormContainer>
        </AuthenticatedLayout>
    );
}
