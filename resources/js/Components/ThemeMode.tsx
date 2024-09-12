import { ButtonHTMLAttributes, useEffect } from 'react';

export default function ThemeModeButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    
    useEffect(() => {
        
        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        
    }, [localStorage]);
    
    
    const toggle = (e:any) => {
        console.log(localStorage.getItem('theme'));
        localStorage.getItem('theme') === 'dark' ? localStorage.setItem('theme', 'light') : localStorage.setItem('theme', 'dark');

        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
    };

    return (
        <button
            onClick={toggle}
            className={
                `inline-flex items-center px-4 py-2 bg-primary-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            { localStorage.getItem('theme') === 'dark' ? 'Light Mode' : 'Dark Mode' }
        </button>
    );
}
