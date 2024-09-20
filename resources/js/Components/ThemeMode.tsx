import { ButtonHTMLAttributes, useEffect, useState } from 'react';
import {
    MoonIcon,
    SunIcon
} from "@heroicons/react/24/outline";
  

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

    
    const light =  <SunIcon />;
    const dark =  <MoonIcon />;

    return (
        <button
            onClick={toggle}  
            disabled={disabled}
            style={{ width: '24px' }}
        > 
            { icon === 'dark' ? dark : light}
        </button>
    );
}
