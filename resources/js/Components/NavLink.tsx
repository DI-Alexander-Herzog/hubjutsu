import { Link, InertiaLinkProps } from '@inertiajs/react';
import classNames from 'classnames';
import { ReactNode } from 'react';

interface NavLinkProps extends InertiaLinkProps {
    icon?: ReactNode;
    active: boolean;
    variant?: 'nav' | 'inline';
    preText?: string;
    statusText?: string;
    statusClassName?: string;
}

export default function NavLink({ 
    active = false, 
    className = '', 
    children, 
    icon = null, 
    variant = 'nav',
    preText,
    statusText,
    statusClassName = 'mt-4 font-medium text-sm text-green-600 dark:text-green-400',
    ...props 
}: NavLinkProps) {
    if (props.target == '_blank') {
       props.onClick = (event) => {
           event.preventDefault();
           window.open(props.href as string, '_blank');
       };
    }

    const variants = {
        nav: active
            ? 'bg-primary hover:text-onprimary group flex gap-x-3 rounded-md p-2 font-semibold leading-6'
            : 'text-gray-700 dark:text-gray-100 hover:bg-primary-300 hover:text-onprimary group flex gap-x-3 rounded-md p-2 font-semibold leading-6',
        inline: 'text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 underline font-medium'
    };

    return (
        <div className="space-y-1 mt-2">
            {variant === 'inline' && preText && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                    {preText}
                    <Link
                        {...props}
                        className={classNames(
                            variants[variant],
                            className
                        )}
                    >
                        {icon}
                        {children}
                    </Link>
                </p>
            )}
            
            {variant !== 'inline' && (
                <Link
                    {...props}
                    className={classNames(
                        variants[variant],
                        className
                    )}
                >
                    {icon}
                    {children}
                </Link>
            )}

            {statusText && (
                <div className={statusClassName}>
                    {statusText}
                </div>
            )}
        </div>
    );
}
