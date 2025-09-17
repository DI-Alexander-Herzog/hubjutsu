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
            ? 'bg-primary text-onprimary flex items-center text-sm font-medium transition-all duration-200 rounded-xl relative group'
            : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 flex items-center text-sm font-medium transition-all duration-200 rounded-xl relative group hover:shadow-md',
        inline: 'text-primary dark:text-primary hover:text-primary/80 dark:hover:text-primary/80 underline font-medium transition-colors duration-200'
    };

    return (
        <div>
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
                        {icon && (
                            <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center mr-2">
                                {icon}
                            </span>
                        )}
                        {children}
                    </Link>
                </p>
            )}
            
            {variant !== 'inline' && (
                <Link
                    {...props}
                    className={classNames(
                        variants[variant],
                        "px-3 py-2.5",
                        className
                    )}
                >
                    {icon && (
                        <span className={classNames(
                            "flex h-6 w-6 flex-shrink-0 items-center justify-center transition-colors duration-200 mr-3",
                            active 
                                ? "text-onprimary" 
                                : "text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary"
                        )}>
                            {icon}
                        </span>
                    )}
                    <span className="truncate font-medium">{children}</span>
                    {active && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 h-2 w-2 bg-onprimary rounded-full"></span>
                    )}
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
