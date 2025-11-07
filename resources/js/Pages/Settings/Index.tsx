import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRightIcon, FolderIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';

import IconLibrary, { iconExists } from '@hubjutsu/Components/IconLibrary';

type SettingEntry = {
    label: string;
    description?: string;
    icon?: string;
    href: string;
    color: string;
    initials: string;
    subtitle?: string;    
}

type SettingGroup = {
    label: string;
    settings: Array<SettingEntry>;
}


export default function Settings({ settings, extraIcons, extraColors }: { settings: Array<SettingGroup>, extraIcons: Record<string, JSX.Element>, extraColors: Record<string, JSX.Element> }) {

    

    const icons = {
        "users": <UserIcon  />,
        "folder": <FolderIcon  />,
        "shield-check": <ShieldCheckIcon  />,
        ...extraIcons
    };

    const colors = {
        'primary': 'bg-primary text-onprimary',
        'secondary': 'bg-secondary text-onsecondary',
        'tertiary': 'bg-tertiary text-ontertiary',
        ...extraColors
    };

    return (
        <AuthenticatedLayout
            title="Settings"
        >
            {settings.map((group) => {
                return <>
                    <FormContainer key={group.label} className="mb-4">
                        <FormSection title={group.label}>
                            <ul role="list" className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 ">
                                {group.settings.map((setting) => (
                                    <li key={setting.label} className="col-span-1 flex rounded-md shadow-sm">
                                        <div
                                            className={classNames(
                                                colors[setting.color as keyof typeof colors] || 'bg-background text-text',
                                                'flex w-16 shrink-0 items-center justify-center rounded-l-md text-sm font-medium',
                                            )}
                                        >
                                            {(() => {
                                                if (iconExists(setting.icon || '')) {
                                                    return <IconLibrary size="xl" name={setting.icon || ''} />;
                                                }
                                                return <>{Object.keys(icons).includes(setting.icon || '') ? <div className='size-8'>{icons[setting.icon as keyof typeof icons]}</div> : setting.initials}</>
                                            })()}
                                        </div>
                                        <div className="flex flex-1 items-center justify-between truncate rounded-r-md border-b border-r border-t border-gray-200 bg-white">
                                        <div className="flex-1 truncate px-4 py-2 text-sm">
                                            <Link href={setting.href} className="font-medium text-gray-900 hover:text-gray-600">
                                            {setting.label}
                                            </Link>
                                            <p className="text-gray-500">{setting.subtitle}</p>
                                        </div>
                                        <div className="shrink-0 pr-2">
                                            <Link
                                                href={setting.href} 
                                                type="button"
                                                className="inline-flex size-8 items-center justify-center rounded-full bg-transparent bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                            >
                                            <span className="sr-only">Open options</span>
                                            <ArrowRightIcon aria-hidden="true" className="size-5" />
                                            </Link>
                                        </div>
                                        </div>
                                    </li>
                                    ))}
                                </ul>            
                        </FormSection>
                    </FormContainer>
                    
                </>
            })}  

            

        </AuthenticatedLayout>
    );
}