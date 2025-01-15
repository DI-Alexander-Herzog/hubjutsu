import { ButtonHTMLAttributes, useEffect, useState } from 'react';
import {
    MoonIcon,
    SunIcon
} from "@heroicons/react/24/outline";
import classNames from 'classnames';
  

export default function ThemeModeButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    
    const [ icon, setIcon ] = useState(localStorage.getItem('theme'));

    useEffect(() => {
        
        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        setIcon(localStorage.getItem('theme'));
        
    }, [localStorage]);
    
    
    const toggle = (e:any) => {
        localStorage.getItem('theme') === 'dark' ? localStorage.setItem('theme', 'light') : localStorage.setItem('theme', 'dark');
        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        setIcon(localStorage.getItem('theme'));
    };

    
    const light =  <SunIcon className={ 'dark:stroke-gray-100 ' + (className ? 'h-6 w-6' : '')}/>;
    const dark =  <MoonIcon  className={ 'dark:stroke-gray-100 ' + (className ? 'h-6 w-6' : '')}/>;

    return (
        <button
            {...props}
            className={classNames( className )}
            onClick={toggle}  
            disabled={disabled}
            style={ className  ? {} : { width: '24px' }}
        > 
            { icon === 'dark' ? dark : light}
        </button>
    );
}
