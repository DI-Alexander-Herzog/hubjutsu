import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames';

const projects = [
  { name: 'User', initials: 'U', href: route('admin.users.index'), members: 16, bgColor: 'bg-pink-600' },
  { name: 'Roles', initials: 'R', href: route('admin.roles.index'), members: 12, bgColor: 'bg-purple-600' },
  { name: 'Hubs', initials: 'H', href: route('admin.hubs.index'), members: 16, bgColor: 'bg-yellow-500' },
]


export default function Settings() {
    return (
        <AuthenticatedLayout
            header="Dashboard"
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="">

                    <ul role="list" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                        {projects.map((project) => (
                            <li key={project.name} className="col-span-1 flex rounded-md shadow-sm">
                                <div
                                className={classNames(
                                    project.bgColor,
                                    'flex w-16 shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white dark:text-gray-100',
                                )}
                                >
                                {project.initials}
                                </div>
                                <div className="flex flex-1 items-center justify-between truncate rounded-r-md border-b border-r border-t border-gray-200 bg-white">
                                <div className="flex-1 truncate px-4 py-2 text-sm">
                                    <Link href={project.href} className="font-medium text-gray-900 hover:text-gray-600">
                                    {project.name}
                                    </Link>
                                    <p className="text-gray-500">{project.members} Members</p>
                                </div>
                                <div className="shrink-0 pr-2">
                                    <Link
                                        href={project.href} 
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


                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}