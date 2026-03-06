import { Models } from '@/types/models';
import FormSection from '@/Components/FormSection';
import { useForm } from '@inertiajs/react';
import FormContainer from '@/Components/FormContainer';
import Checkbox from '@/Components/Checkbox';
import PrimaryButton from '@/Components/PrimaryButton';

type PermissionColumnType = {
    key: string;
    label: string;
};

type PermissionActionType = {
    key: string;
    label: string;
};

type PermissionRowType = {
    name: string;
    group: string;
    actions: Record<string, PermissionActionType>;
    specialPermissions?: PermissionActionType[];
};

type PermissionTableType = {
    columns: PermissionColumnType[];
    rows: PermissionRowType[];
    customGroups?: Array<{
        name: string;
        group: string;
        permissions: PermissionActionType[];
    }>;
};


export default function RoleForm({ disabled = false, role, permissions }: { disabled?: boolean, role?: Models.Role, permissions?: PermissionTableType }) {

    const { data, setData, post, processing, errors } = useForm<{
        id: number | null,
        permissions: string[]
    }>({ 
        id: role?.id ?? null,
        permissions: role?.permissions?.map((p) => p.permission) || []
     });


    const updatePermissions = (permission: string, value: boolean) => {
        setData((prev) => {
            if (value) {
                return {...prev, permissions: [...prev.permissions, permission]};
            } else {
                return {...prev, permissions: prev.permissions.filter((p) => p !== permission)};
            }
        });
    };

    const save = (e: React.FormEvent) => {
        
        e.preventDefault();
        post(route('admin.roles.update', { role: role?.id }), {
            preserveScroll: true,
            onSuccess: () => {
                
            }
        });
    };

    const table = permissions;

    return (
        <form onSubmit={save} className="space-y-6 p-6">
            {table?.rows?.map((row) => (
                <FormContainer key={row.group} className="w-full">
                    <FormSection title={row.name}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr>
                                        {table.columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className="border-b border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-300"
                                                title={column.label}
                                            >
                                                {column.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="align-middle">
                                        {table.columns.map((column) => {
                                            const action = row.actions[column.key];
                                            if (!action) {
                                                return (
                                                    <td key={`${row.group}-${column.key}`} className="border-b border-gray-200 px-3 py-2 text-center dark:border-gray-800">
                                                        <span className="text-gray-300 dark:text-gray-700">-</span>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={action.key} className="border-b border-gray-200 px-3 py-2 text-center dark:border-gray-800" title={action.label}>
                                                    <Checkbox
                                                        checked={data.permissions.includes(action.key)}
                                                        onChange={(e) => updatePermissions(action.key, e.target.checked)}
                                                        disabled={disabled}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {(row.specialPermissions?.length ?? 0) > 0 && (
                            <div className="mt-4 rounded border border-gray-200 p-3 dark:border-gray-800">
                                <div className="mb-2 text-sm font-semibold text-text dark:text-gray-200">Spezielle Rechte</div>
                                <div className="space-y-2">
                                    {row.specialPermissions?.map((permission) => (
                                        <label key={permission.key} className="flex items-center gap-2 text-sm text-text dark:text-gray-200">
                                            <Checkbox
                                                checked={data.permissions.includes(permission.key)}
                                                onChange={(e) => updatePermissions(permission.key, e.target.checked)}
                                                disabled={disabled}
                                            />
                                            {permission.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </FormSection>
                </FormContainer>
            ))}

            {(table?.customGroups?.length ?? 0) > 0 && (
                <FormContainer className="w-full">
                    <FormSection title="Additional Permissions">
                        <div className="grid grid-cols-1 gap-4">
                            {table?.customGroups?.map((group) => (
                                <div key={group.group} className="rounded border border-gray-200 p-3 dark:border-gray-800">
                                    <div className="mb-2 text-sm font-semibold text-text dark:text-gray-200">{group.name}</div>
                                    <div className="space-y-2">
                                        {group.permissions.map((permission) => (
                                            <label key={permission.key} className="flex items-center gap-2 text-sm text-text dark:text-gray-200">
                                                <Checkbox
                                                    checked={data.permissions.includes(permission.key)}
                                                    onChange={(e) => updatePermissions(permission.key, e.target.checked)}
                                                    disabled={disabled}
                                                />
                                                {permission.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FormSection>
                </FormContainer>
            )}

            <PrimaryButton disabled={processing || disabled} type='submit'>Save</PrimaryButton>
        </form>
    );
}
