import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LearningBundleForm from './Form';
import DataTable from '@/Components/DataTable';
import DataTableLink from '@/Components/DataTableLink';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';

export default function LearningBundleView({
    learning_bundle,
}: {
    learning_bundle: any;
}) {
    return (
        <AuthenticatedLayout
            title="Learning Bundle"
            breadcrumbs={[
                { label: 'Settings', url: route('settings.index') },
                { label: 'Learning Bundles', url: route('settings.learningbundles.index') },
                { label: learning_bundle?.name || 'Bundle' },
            ]}
        >
            <LearningBundleForm
                learning_bundle={learning_bundle}
                disabled={true}
            />

            {learning_bundle?.id && (
                <FormContainer>
                    <FormSection title="Rollen" subtitle="Rollen mit Zugriff auf dieses Bundle">
                        <DataTable
                            routemodel="learning_bundle_role"
                            with={['role']}
                            filters={{ learning_bundle_id: learning_bundle.id }}
                            height="320px"
                            perPage={20}
                            defaultSortField={[["role_id", 1], ["id", 1]]}
                            newRecord={false}
                            disableDelete
                            columns={[
                                {
                                    field: 'role_id',
                                    label: 'Rolle',
                                    sortable: true,
                                    filter: true,
                                    frozen: true,
                                    width: '380px',
                                    formatter: (row: any) => {
                                        const roleId = Number(row.role_id || row.role?.id || 0);
                                        const roleLabel = row.role?.name || (roleId > 0 ? `#${roleId}` : '-');

                                        if (roleId <= 0) {
                                            return roleLabel;
                                        }

                                        return (
                                            <DataTableLink href={route('admin.roles.edit', { role: roleId })}>
                                                {roleLabel}
                                            </DataTableLink>
                                        );
                                    },
                                },
                            ]}
                        />
                    </FormSection>
                </FormContainer>
            )}
        </AuthenticatedLayout>
    );
}
