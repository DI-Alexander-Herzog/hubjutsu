import { Models } from '@/types/models';
import FormSection from '@/Components/FormSection';
import { useForm } from '@inertiajs/react';
import FormContainer from '@hubjutsu/Components/FormContainer';
import Checkbox from '@/Components/Checkbox';
import PrimaryButton from '@hubjutsu/Components/PrimaryButton';
import { useEffect } from 'react';

type PermissionTableType = {
    'name': string,
    'group': string,
    'permissions': Array<string[]>
};


export default function RoleForm({ disabled = false, role, permissions }: { disabled?: boolean, role?: Models.Role, permissions?: PermissionTableType[] }) {

    const { data, setData, post, processing, errors } = useForm<{
        id: number | null,
        permissions: string[]
    }>({ 
        id: role?.id ?? null,
        permissions: role?.permissions?.map(p => p.permission) || []
     });

     useEffect(() => {
        const int = setInterval(() => {
            console.log(data);
        }, 1000);
        return () => {
            clearInterval(int);
        };
     }, [data]);

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

    return (
        
        <form onSubmit={save} className="grid grid-cols-2 gap-6 p-6">
        {permissions?.map((type: PermissionTableType) => (
            <FormContainer key={type.group} className="w-full ">
                <FormSection title={type.name} >
                    
                    {type.permissions.map(permission => (
                        <div>
                            <label>
                                <Checkbox
                                    checked={data.permissions.includes(permission[0])}
                                    onChange={(e) => updatePermissions(permission[0], e.target.checked)}
                                    disabled={disabled}
                                    className='mr-2'
                                />
                                {permission[1]}
                            </label>

                        </div>
                        
                    ))}
                    
                </FormSection>
            </FormContainer>

            ))}

            <PrimaryButton disabled={processing || disabled} type='submit'>Save</PrimaryButton>
        </form>
    );
}