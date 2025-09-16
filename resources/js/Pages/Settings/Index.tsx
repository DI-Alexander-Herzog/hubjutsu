import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRightIcon, FolderIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames';
import FormContainer from '@hubjutsu/Components/FormContainer';
import FormSection from '@hubjutsu/Components/FormSection';

type SettingEntry = {
    label: string;
    description?: string;
    icon?: string;
    href: string;
    bgColor: string;
    textColor?: string;
    initials: string;
    subtitle?: string;    
}

type SettingGroup = {
    label: string;
    settings: Array<SettingEntry>;
}


export default function Settings({ settings, extraIcons }: { settings: Array<SettingGroup>, extraIcons: Record<string, JSX.Element> }) {


    const icons = {
        "users": <UserIcon  />,
        "folder": <FolderIcon  />,
        "shield-check": <ShieldCheckIcon  />,
        ...extraIcons
    };

    return (
        <AuthenticatedLayout
            title="Settings"
        >
            {settings.map((group) => {
                return <>
                    <FormContainer>
                        <FormSection title={group.label}>
                            <ul role="list" className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 ">
                                {group.settings.map((setting) => (
                                    <li key={setting.label} className="col-span-1 flex rounded-md shadow-sm">
                                        <div
                                            className={classNames(
                                                'bg-' + setting.bgColor,
                                                'text-' + (setting.textColor ?? 'white'),
                                                'flex w-16 shrink-0 items-center justify-center rounded-l-md text-sm font-medium',
                                                'dark:text-gray-100 dark:bg-gray-700',
                                            )}
                                        >
                                            {Object.keys(icons).includes(setting.icon || '') ? <div className='size-8'>{icons[setting.icon as keyof typeof icons]}</div> : setting.initials}
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