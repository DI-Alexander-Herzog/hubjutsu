import classNames from 'classnames';
import { HTMLAttributes } from 'react';

type ContainerSize = 'small' | 'medium' | 'large';
type ContainerGap = 'none' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ContainerSize, string> = {
    small: 'max-w-4xl',
    medium: 'max-w-6xl',
    large: 'max-w-7xl',
};

const GAP_CLASS: Record<ContainerGap, string> = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
};

export default function Container({
    children,
    className,
    size = 'large',
    gap = 'none',
    stack = false,
    ...props
}: HTMLAttributes<HTMLDivElement> & { size?: ContainerSize; gap?: ContainerGap; stack?: boolean }) {
    return (
        <div
            {...props}
            className={classNames(
                'mx-auto w-full px-4 sm:px-6 lg:px-8',
                SIZE_CLASS[size],
                (stack || gap !== 'none') && 'flex flex-col',
                GAP_CLASS[gap],
                className
            )}
        >
            {children}
        </div>
    );
}
