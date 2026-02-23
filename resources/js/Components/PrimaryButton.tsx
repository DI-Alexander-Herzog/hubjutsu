import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

type ButtonSize = 'small' | 'default' | 'large';
type ButtonDisplay = 'solid' | 'outline';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: ButtonSize;
    display?: ButtonDisplay;
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-2 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    large: 'px-5 py-3 text-base',
};

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    size = 'default',
    display = 'solid',
    ...props
}: PrimaryButtonProps) {
    return (
        <button
            {...props}
            className={
                classNames(
                    'inline-flex items-center ',
                    'transition ease-in-out duration-150',
                    'border border-transparent rounded-md font-semibold  tracking-widest ',

                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'focus:ring-primary dark:focus:ring-offset-onprimary',
                    display === 'outline'
                        ? [
                            'border-primary text-primary bg-transparent dark:border-onprimary dark:text-onprimary',
                            'hover:bg-primary/10 dark:hover:bg-onprimary/10',
                            'active:bg-primary/20 dark:active:bg-onprimary/20',
                        ]
                        : [
                            'bg-primary text-onprimary dark:bg-onprimary dark:text-primary',
                            'hover:bg-primary-300 hover:text-onprimary-300 dark:hover:bg-onprimary-300 dark:hover:text-primary-300',
                            'active:bg-primary-900 dark:active:bg-onprimary-300',
                            'active:text-onprimary-900 dark:active:text-primary-300',
                            'focus:bg-gray-700 dark:focus:bg-primary-300',
                            'dark:focus:text-onprimary',
                        ],
                    sizeClasses[size],
                    
                    {
                        'opacity-25': disabled,
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
