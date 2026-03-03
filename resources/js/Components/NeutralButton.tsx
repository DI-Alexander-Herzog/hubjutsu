import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

type ButtonSize = 'small' | 'default' | 'large';
type ButtonDisplay = 'solid' | 'outline';

type NeutralButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: ButtonSize;
    display?: ButtonDisplay;
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-2 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    large: 'px-5 py-3 text-base',
};

export default function NeutralButton({
    type = 'button',
    className = '',
    disabled,
    children,
    size = 'default',
    display = 'solid',
    ...props
}: NeutralButtonProps) {
    const hasZeroPaddingOverride = /(?:^|\s)p-0(?:\s|$)/.test(className);

    return (
        <button
            {...props}
            type={type}
            className={
                classNames(
                    'inline-flex items-center rounded-md font-semibold tracking-widest shadow-sm transition ease-in-out duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                    display === 'outline'
                        ? [
                            'border border-gray-300 text-text-700 bg-transparent dark:border-gray-500 dark:text-gray-300',
                            'hover:bg-background-600 dark:hover:bg-gray-700',
                            'active:bg-background-600 dark:active:bg-gray-600',
                        ]
                        : [
                            'bg-background dark:bg-gray-800 border border-gray-300 dark:border-gray-500 text-text-700 dark:text-gray-300',
                            'hover:bg-background-600 dark:hover:bg-gray-700',
                            'active:bg-background-600 dark:active:bg-gray-600',
                        ],
                    !hasZeroPaddingOverride && sizeClasses[size],
                    {
                        'opacity-25': disabled,
                    },
                    className,
                )
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
