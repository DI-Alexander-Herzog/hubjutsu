import classNames from 'classnames';
import { ButtonHTMLAttributes } from 'react';

type ButtonSize = 'small' | 'default' | 'large';
type ButtonDisplay = 'solid' | 'outline';

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: ButtonSize;
    display?: ButtonDisplay;
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-2 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    large: 'px-5 py-3 text-base',
};

export default function DangerButton({
    className = '',
    disabled,
    children,
    size = 'default',
    display = 'solid',
    ...props
}: DangerButtonProps) {
    const hasZeroPaddingOverride = /(?:^|\s)p-0(?:\s|$)/.test(className);

    return (
        <button
            {...props}
            className={
                classNames(
                    'inline-flex items-center rounded-md font-semibold tracking-widest transition ease-in-out duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                    display === 'outline'
                        ? [
                            'border border-red-600 text-red-600 bg-transparent dark:border-red-400 dark:text-red-400',
                            'hover:bg-red-50 dark:hover:bg-red-900/20',
                            'active:bg-red-100 dark:active:bg-red-900/30',
                        ]
                        : [
                            'bg-red-600 border border-transparent text-white',
                            'hover:bg-red-500 active:bg-red-700',
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
