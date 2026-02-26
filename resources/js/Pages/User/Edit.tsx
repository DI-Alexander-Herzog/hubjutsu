import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function UserEdit() {
    return (
        <AuthenticatedLayout
            title="Role"
        >
            <Head title="Role" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-background dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-text-900 dark:text-gray-100">IRGENDWELCHE SETTINGS!</div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}