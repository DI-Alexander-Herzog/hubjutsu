import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                classNames(
                    'inline-flex items-center  bg-red-600 border border-transparent rounded-md font-semibold text-white  tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150',
                    className,
                    {
                        'opacity-25': disabled,
                        'px-4': className.indexOf('px-') === -1,
                        'py-2': className.indexOf('py-') === -1
                    }
                )
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
