import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({ type = 'button', className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                classNames(
                    'inline-flex items-center  bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-md font-semibold  text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-25 transition ease-in-out duration-150',
                    {
                        'opacity-25': disabled,
                        'px-4': className.indexOf('px-') === -1,
                        'py-2': className.indexOf('py-') === -1
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
