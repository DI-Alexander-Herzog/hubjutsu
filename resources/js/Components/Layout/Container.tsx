import classNames from 'classnames';
import { HTMLAttributes } from 'react';

type ContainerSize = 'small' | 'medium' | 'large';

const SIZE_CLASS: Record<ContainerSize, string> = {
    small: 'max-w-4xl',
    medium: 'max-w-6xl',
    large: 'max-w-7xl',
};

export default function Container({
    children,
    className,
    size = 'large',
    ...props
}: HTMLAttributes<HTMLDivElement> & { size?: ContainerSize }) {
    return (
        <div
            {...props}
            className={classNames(
                'mx-auto w-full px-4 sm:px-6 lg:px-8',
                SIZE_CLASS[size],
                className
            )}
        >
            {children}
        </div>
    );
}
