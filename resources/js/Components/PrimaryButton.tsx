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
                    'focus:ring-primary focus:ring-offset-background dark:focus:ring-offset-gray-900',
                    display === 'outline'
                        ? [
                            'border-primary text-primary bg-transparent dark:border-onprimary dark:text-onprimary',
                            'hover:bg-primary/10 dark:hover:bg-onprimary/10',
                            'active:bg-primary/20 dark:active:bg-onprimary/20',
                        ]
                        : [
                            'bg-primary text-onprimary',
                            'hover:brightness-95',
                            'active:brightness-90',
                            'focus:text-onprimary',
                        ],
                    sizeClasses[size],
                    
                    {
                        'opacity-25 cursor-not-allowed': disabled,
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
