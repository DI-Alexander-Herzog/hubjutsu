import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import ThemeModeButton from '@hubjutsu/Components/ThemeMode';

export default function Guest({ children }: PropsWithChildren) {




    return (

        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100 dark:bg-gray-900 text-black  dark:text-gray-100">
            <div className="w-full sm:max-w-md flex items-center justify-end">
                <ThemeModeButton />
            </div>
            <div>
                <Link href="/">
                    <ApplicationLogo className="w-20 max-h-20 fill-current text-gray-500" />
                </Link>
            </div>

            <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white dark:bg-gray-800 shadow-md overflow-hidden sm:rounded-lg">
                {children}
            </div>

            
        </div>
    );
}
