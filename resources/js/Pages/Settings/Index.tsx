import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { ArrowRightIcon, FolderIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Card from '@/Components/Layout/Card';

import IconLibrary, { iconExists } from '@/Components/IconLibrary';

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
            <div className="pt-4">
                {settings.map((group) => {
                    return <FormContainer key={group.label} className="mb-4">
                        <FormSection title={group.label}>
                            <ul role="list" className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 ">
                                {group.settings.map((setting) => (
                                    <li key={setting.label} className="col-span-1">
                                        <Card className="h-full">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <div
                                                        className={classNames(
                                                            colors[setting.color as keyof typeof colors] || 'bg-background text-text',
                                                            'flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-medium',
                                                        )}
                                                    >
                                                        {(() => {
                                                            if (iconExists(setting.icon || '')) {
                                                                return <IconLibrary size="xl" name={setting.icon || ''} />;
                                                            }
                                                            return <>{Object.keys(icons).includes(setting.icon || '') ? <div className='size-8'>{icons[setting.icon as keyof typeof icons]}</div> : setting.initials}</>
                                                        })()}
                                                    </div>
                                                    <div className="min-w-0 flex-1 truncate">
                                                        <Link href={setting.href} className="font-medium text-text-900 hover:text-text-600">
                                                            {setting.label}
                                                        </Link>
                                                        <p className="text-sm text-text-500">{setting.subtitle}</p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <Link
                                                        href={setting.href} 
                                                        type="button"
                                                        className="inline-flex size-8 items-center justify-center rounded-full bg-transparent text-text-400 hover:text-text-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                    >
                                                        <span className="sr-only">Open options</span>
                                                        <ArrowRightIcon aria-hidden="true" className="size-5" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </Card>
                                    </li>
                                    ))}
                                </ul>            
                        </FormSection>
                    </FormContainer>;
                })}  
            </div>

        </AuthenticatedLayout>
    );
}
