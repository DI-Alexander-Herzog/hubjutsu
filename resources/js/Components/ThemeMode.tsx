import { ButtonHTMLAttributes, useEffect } from 'react';
import SecondaryButton from '@/Components/SecondaryButton';

export default function ThemeModeButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    
    useEffect(() => {
        
        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        
    }, [localStorage]);
    
    
    const toggle = (e:any) => {
        localStorage.getItem('theme') === 'dark' ? localStorage.setItem('theme', 'light') : localStorage.setItem('theme', 'dark');

        localStorage.getItem('theme') === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
    };

    return (
        <SecondaryButton
            onClick={toggle}
            
            disabled={disabled}
        >
            { localStorage.getItem('theme') === 'dark' ? 'Light Mode' : 'Dark Mode' }
        </SecondaryButton>
    );
}
