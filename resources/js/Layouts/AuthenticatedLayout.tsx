import { useState, PropsWithChildren, ReactNode } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import NavLink from '@/Components/NavLink';
import classNames from 'classnames';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    TransitionChild,
  } from '@headlessui/react'
  import {
    Bars3Icon,
    BellIcon,
    Cog6ToothIcon,
    XMarkIcon,
  } from '@heroicons/react/24/outline'
  import { ChevronDownIcon } from '@heroicons/react/20/solid'
import ThemeMode from '@/Components/ThemeMode';
import Avatar from '@/Components/Avatar';
import { SearchProvider } from '@/Components/SearchContext';
import TopSearch from '@hubjutsu/Components/TopSearch';
import Breadcrumbs, {Breadcrumb} from '@/Components/Breadcrumbs';


export default function Authenticated({ title, children, breadcrumbs }: PropsWithChildren<{ title?: string, breadcrumbs?: Breadcrumb[] }>) {

    const page = usePage<PageProps>();
    const user = page.props.auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
      <SearchProvider>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="h-6 w-6 text-white" />
                  </button>
                </div>
              </TransitionChild>
              {/* Sidebar component, swap this element with another sidebar if you like */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                    <ApplicationLogo className="h-8 w-auto" />
                  
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  {Object.keys(page.props.menus).map((menuSlug, index) => {
                      const menu = page.props.menus[menuSlug];

                      return <li key={menuSlug}>
                        { index > 0 && <div className="text-xs font-semibold leading-6 text-gray-400">{menu.name}</div>}
                        <ul role="list" className={classNames("-mx-2 space-y-1", { "mt-2": index > 0 })} >
                            {menu.items?.map((item, index) => {
                              
                              return <li key={item.title + ' ' + index}>
                                <NavLink target={item.target} href={Array.isArray(item.route) ? route(item.route[0] as string, item.route[1] as any[]) : '' + item.route} active={item.active} icon={item.icon}>
                                  {item.title}
                                </NavLink>
                              </li>;
                            })}
                        
                        </ul>
                      </li>;
                    })}
                    <li className="mt-auto">
                        <NavLink href={route('settings.index')}  active={false}
                            icon={<Cog6ToothIcon
                                aria-hidden="true"
                                className={classNames(
                                'h-6 w-6 shrink-0',
                                )}
                            />}>
                            Settings
                        </NavLink>
                      
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col  bg-gray-100 dark:bg-gray-900 text-black  dark:text-gray-100">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white dark:bg-slate-950 dark:text-gray-100  px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
            <ApplicationLogo className="h-8 w-auto" />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                
                {Object.keys(page.props.menus).map((menuSlug, index) => {
                  const menu = page.props.menus[menuSlug];

                  return <li key={menuSlug}>
                    { index > 0 && <div className="text-xs font-semibold leading-6 text-gray-400">{menu.name}</div>}
                    <ul role="list" className={classNames("-mx-2 space-y-1", { "mt-2": index > 0 })} >
                        {menu.items?.map((item, index) => {
                          
                          return <li key={item.title + ' ' + index}>
                            <NavLink target={item.target} href={Array.isArray(item.route) ? route(item.route[0] as string, item.route[1] as any[]) : '' + item.route} active={item.active} icon={item.icon}>
                              {item.title}
                            </NavLink>
                          </li>;
                        })}
                     
                    </ul>
                  </li>;
                })}
                
                
                <li className="mt-auto">
                  <NavLink href={route('settings.index')}   active={false}
                      icon={<Cog6ToothIcon
                          aria-hidden="true"
                          className={classNames(
                          'h-6 w-6 shrink-0',
                          )}
                      />}>
                      Settings
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-64 flex flex-col h-full">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
            <button type="button" onClick={() => setSidebarOpen(true)} className="-m-2.5 p-2.5 lg:hidden">
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6 stroke-text dark:stroke-white" />
            </button>
            
            {/* Separator */}
            <div aria-hidden="true" className="h-6 w-px lg:hidden" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <TopSearch  />

              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <button type="button" className="-m-2.5 p-2.5 ">
                  <span className="sr-only">View notifications</span>
                  <BellIcon aria-hidden="true" className="h-6 w-6 dark:stroke-gray-100" />
                </button>
                <ThemeMode  className="-m-2.5 p-2.5 " />

                {/* Separator */}
                <div aria-hidden="true" className="hidden lg:block lg:h-6 lg:w-px 0" />

                {/* Profile dropdown */}
                <Menu as="div" className="relative">
                  <MenuButton className="-m-1.5 flex items-center p-1.5 dark:text-gray-100">
                    <span className="sr-only">Open user menu</span>
                    <Avatar user={user} className="h-8 w-8" />
                    
                    <span className="hidden lg:flex lg:items-center">
                      <span aria-hidden="true" className="ml-4 text-sm font-semibold leading-6">
                        { user.name }
                      </span>
                      <ChevronDownIcon aria-hidden="true" className="ml-2 h-5 w-5 " />
                    </span>
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md text-gray-900 bg-white dark:text-gray-100 dark:bg-gray-800 py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                        <MenuItem>
                            <Link href={route('profile.edit')}
                            className="block px-3 py-1 text-sm leading-6  data-[focus]:bg-gray-50 dark:data-[focus]:text-gray-900"
                            >
                                Profile
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href={route('logout')} method="post"
                            className="block px-3 py-1 text-sm leading-6  data-[focus]:bg-gray-50 dark:data-[focus]:text-gray-900"
                            >
                                Sign out
                            </Link>
                      </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </div>

          <Head title={title} />
          <main className="flex-grow overflow-hidden">
            <div className='h-full flex flex-col'>
              {breadcrumbs && <div className='flex-shrink'>
                <Breadcrumbs items={breadcrumbs} />
              </div> }

              <div className="flex-grow overflow-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SearchProvider>
    );
}