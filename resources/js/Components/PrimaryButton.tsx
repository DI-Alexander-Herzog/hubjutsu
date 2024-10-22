import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                classNames(
                    'inline-flex items-center px-4 py-2 ',
                    'transition ease-in-out duration-150',
                    'border border-transparent rounded-md font-semibold text-xs uppercase tracking-widest ',

                    'bg-primary text-onprimary dark:bg-onprimary dark:text-primary',
                    'hover:bg-primary-300 hover:text-onprimary-300 dark:hover:bg-onprimary-300 dark:hover:text-primary-300',
                                        
                    'active:bg-primary-900 dark:active:bg-onprimary-300',
                    'active:text-onprimary-900 dark:active:text-primary-300',

                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'focus:bg-gray-700 dark:focus:bg-primary-300',
                    'dark:focus:text-onprimary',
                    'focus:ring-primary dark:focus:ring-offset-onprimary',
                    {
                        'opacity-25': disabled
                    },
                    className
                )
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
