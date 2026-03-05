import classNames from 'classnames';
import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

type CardVariant = 'default' | 'muted';

type CardProps = {
    className?: string;
    bodyClassName?: string;
    title?: ReactNode;
    subtitle?: ReactNode;
    titleClassName?: string;
    subtitleClassName?: string;
    imageUrl?: string | null;
    imageAlt?: string;
    imageHeightClassName?: string;
    imageFallback?: ReactNode;
    href?: string;
    variant?: CardVariant;
    children?: ReactNode;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
    default: 'bg-background shadow-md',
    muted: 'bg-background-600/80 shadow-md',
};

function CardInner({
    title,
    subtitle,
    titleClassName,
    subtitleClassName,
    imageUrl,
    imageAlt,
    imageHeightClassName,
    imageFallback,
    bodyClassName,
    children,
}: Omit<CardProps, 'className' | 'href' | 'variant'>) {
    return (
        <>
            {imageUrl !== undefined && (
                <div className={classNames('w-full bg-background-600', imageHeightClassName || 'h-44')}>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={imageAlt || ''}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        imageFallback || (
                            <div className="flex h-full w-full items-center justify-center text-sm text-text-500">
                                Kein Cover
                            </div>
                        )
                    )}
                </div>
            )}

            {(title || subtitle || children) && (
                <div className={classNames('space-y-3 p-4', bodyClassName)}>
                    {title && (
                        <h2 className={classNames('text-lg font-semibold text-text-900', titleClassName)}>
                            {title}
                        </h2>
                    )}
                    {subtitle && (
                        <p className={classNames('text-sm text-text-500', subtitleClassName)}>
                            {subtitle}
                        </p>
                    )}
                    {children}
                </div>
            )}
        </>
    );
}

export default function Card({
    className,
    href,
    variant = 'default',
    ...props
}: CardProps) {
    const baseClass = classNames(
        'overflow-hidden rounded-xl',
        VARIANT_CLASS[variant],
        className
    );

    if (href) {
        return (
            <Link href={href} className={baseClass}>
                <CardInner {...props} />
            </Link>
        );
    }

    return (
        <article className={baseClass}>
            <CardInner {...props} />
        </article>
    );
}
