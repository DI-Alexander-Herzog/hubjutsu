import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

type ButtonSize = 'small' | 'default' | 'large';
type ButtonDisplay = 'solid' | 'outline';

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: ButtonSize;
    display?: ButtonDisplay;
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-2 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    large: 'px-5 py-3 text-base',
};

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    size = 'default',
    display = 'solid',
    ...props
}: SecondaryButtonProps) {
    return (
        <button
            {...props}
            type={type}
            className={
                classNames(
                    'inline-flex items-center rounded-md font-semibold tracking-widest transition ease-in-out duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                    display === 'outline'
                        ? [
                            'border border-secondary text-secondary bg-transparent dark:border-onsecondary dark:text-onsecondary',
                            'hover:bg-secondary/10 dark:hover:bg-onsecondary/10',
                            'active:bg-secondary/20 dark:active:bg-onsecondary/20',
                        ]
                        : [
                            'border border-transparent bg-secondary text-onsecondary dark:bg-onsecondary dark:text-secondary',
                            'hover:bg-secondary-300 hover:text-onsecondary-300 dark:hover:bg-onsecondary-300 dark:hover:text-secondary-300',
                            'active:bg-secondary-900 active:text-onsecondary-900 dark:active:bg-onsecondary-300 dark:active:text-secondary-300',
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
