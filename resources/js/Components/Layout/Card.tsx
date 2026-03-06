import classNames from 'classnames';
import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

type CardVariant = 'default' | 'muted';
type CardImagePosition = 'top' | 'left';

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
    imageWidthClassName?: string;
    imageFallback?: ReactNode;
    imagePosition?: CardImagePosition;
    progressPercent?: number | null;
    href?: string;
    variant?: CardVariant;
    children?: ReactNode;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
    default: 'bg-background dark:bg-gray-800 shadow-[0_10px_30px_rgba(16,24,40,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-black/5 dark:border-white/10',
    muted: 'bg-background-600/80 dark:bg-gray-800/80 shadow-[0_10px_30px_rgba(16,24,40,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-black/5 dark:border-white/10',
};

function CardInner({
    title,
    subtitle,
    titleClassName,
    subtitleClassName,
    imageUrl,
    imageAlt,
    imageHeightClassName,
    imageWidthClassName,
    imageFallback,
    imagePosition = 'top',
    progressPercent = null,
    bodyClassName,
    children,
    interactive = false,
}: Omit<CardProps, 'className' | 'href' | 'variant'> & { interactive?: boolean }) {
    const resolvedProgress = typeof progressPercent === 'number'
        ? Math.max(0, Math.min(100, Math.round(progressPercent)))
        : null;

    const imageNode = imageUrl !== undefined && (
        <div
            className={classNames(
                'bg-background-600 dark:bg-gray-700',
                imagePosition === 'left'
                    ? (imageWidthClassName || 'w-full md:w-72 shrink-0')
                    : 'w-full',
                imagePosition === 'left'
                    ? (imageHeightClassName || 'relative overflow-hidden h-52 md:h-auto')
                    : (imageHeightClassName || 'h-44')
            )}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={imageAlt || ''}
                    className={classNames(
                        imagePosition === 'left'
                            ? 'absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out'
                            : 'h-full w-full object-cover transition-transform duration-300 ease-out',
                        interactive && 'group-hover:scale-[1.02]'
                    )}
                />
            ) : (
                imageFallback || (
                    <div className="flex h-full w-full items-center justify-center text-sm text-text-500 dark:text-gray-400">
                        Kein Cover
                    </div>
                )
            )}
        </div>
    );

    const contentNode = (title || subtitle || children) && (
        <div className={classNames('space-y-3 p-4', bodyClassName)}>
            {title && (
                <h2 className={classNames('text-lg font-semibold text-text-900 dark:text-gray-100', titleClassName)}>
                    {title}
                </h2>
            )}
            {subtitle && (
                <p className={classNames('text-sm text-text-500 dark:text-gray-400', subtitleClassName)}>
                    {subtitle}
                </p>
            )}
            {children}
        </div>
    );

    const horizontalProgressNode = resolvedProgress !== null && (
        <div className="h-2 w-full bg-background-700/70 dark:bg-gray-700/80">
            <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${resolvedProgress}%` }}
            />
        </div>
    );

    const verticalProgressNode = resolvedProgress !== null && (
        <div className="hidden md:flex w-2 shrink-0 bg-background-700/70 dark:bg-gray-700/80">
            <div
                className="mt-auto w-full bg-primary transition-all duration-300 ease-out"
                style={{ height: `${resolvedProgress}%` }}
            />
        </div>
    );

    if (imagePosition === 'left') {
        return (
            <div>
                <div className="md:flex md:items-stretch">
                    {imageNode}
                    {horizontalProgressNode && <div className="md:hidden">{horizontalProgressNode}</div>}
                    {verticalProgressNode}
                    {contentNode}
                </div>
            </div>
        );
    }

    return (
        <div>
            {imageNode}
            {horizontalProgressNode}
            {contentNode}
        </div>
    );
}

export default function Card({
    className,
    href,
    variant = 'default',
    ...props
}: CardProps) {
    const baseClass = classNames(
        'overflow-hidden rounded-xl card-fade-up',
        VARIANT_CLASS[variant],
        href && 'block transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className
    );

    if (href) {
        return (
            <Link href={href} className={classNames('group', baseClass)}>
                <CardInner {...props} interactive />
            </Link>
        );
    }

    return (
        <article className={baseClass}>
            <CardInner {...props} />
        </article>
    );
}
