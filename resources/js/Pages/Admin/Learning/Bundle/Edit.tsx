import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LearningBundleForm from './Form';

export default function LearningBundleEdit({ learning_bundle }: { learning_bundle: any }) {
    return (
        <AuthenticatedLayout
            title="Learning Bundle"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Bundles', url: route('settings.learningbundles.index') },
                { label: learning_bundle?.name || 'Bundle' },
            ]}
        >
            <LearningBundleForm learning_bundle={learning_bundle} disabled={false} />
        </AuthenticatedLayout>
    );
}
