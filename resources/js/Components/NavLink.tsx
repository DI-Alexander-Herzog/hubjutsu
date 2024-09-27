import { Link, InertiaLinkProps } from '@inertiajs/react';
import classNames from 'classnames';
import {ReactNode } from 'react';

export default function NavLink({ active = false, className = '', children, icon=null, ...props }: InertiaLinkProps & { icon:ReactNode, active: boolean }) {
    if (props.target == '_blank') {
       props.onClick = (event) => {
           event.preventDefault();
           window.open(props.href, '_blank');
       };
    }
    return (
        <Link
            {...props}
            className={
                (active
                              ? 'bg-gray-50 text-primary-600 '
                              : 'text-gray-700 dark:text-gray-100 hover:bg-gray-50 hover:text-primary-600 ' 
                ) + 
                ' group flex gap-x-3 rounded-md p-2 font-semibold leading-6 ' + 
                className
            }
        >
            {icon}
            
            {children}
        </Link>
    );
}
