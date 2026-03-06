import classNames from 'classnames';
import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

type SideCardProps = {
    className?: string;
    href?: string;
    imageUrl?: string | null;
    fallbackImageUrl?: string | null;
    imageContainerClassName?: string;
    imageHref?: string;
    imageAlt?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    right?: ReactNode;
    progressPercent?: number | null;
};

function Inner({
    imageUrl,
    fallbackImageUrl,
    imageContainerClassName,
    imageHref,
    imageAlt,
    title,
    subtitle,
    right,
    progressPercent = null,
    interactive = false,
}: Omit<SideCardProps, 'className' | 'href'> & { interactive?: boolean }) {
    const resolvedImageUrl = imageUrl || fallbackImageUrl || null;
    const resolvedProgress = typeof progressPercent === 'number'
        ? Math.max(0, Math.min(100, Math.round(progressPercent)))
        : null;

    const imageContent = (
        <>
            {resolvedImageUrl ? (
                <img
                    src={resolvedImageUrl}
                    alt={imageAlt || ''}
                    className={classNames(
                        'absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out',
                        interactive && 'group-hover:scale-[1.02]'
                    )}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-500 dark:text-gray-400">
                    Kein Cover
                </div>
            )}
        </>
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

    return (
        <div className="flex items-stretch">
            <div className={classNames('relative w-[15%] min-w-[86px] shrink-0 self-stretch overflow-hidden bg-background-600 dark:bg-gray-700', imageContainerClassName)}>
                {imageHref ? (
                    <a href={imageHref} className="block h-full w-full">
                        {imageContent}
                    </a>
                ) : (
                    imageContent
                )}
            </div>
            {horizontalProgressNode && <div className="md:hidden">{horizontalProgressNode}</div>}
            {verticalProgressNode}

            <div className="flex min-w-0 flex-1 items-center gap-4 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-semibold text-text-900 dark:text-gray-100">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">
                            {subtitle}
                        </p>
                    )}
                </div>

                {right && (
                    <div className="shrink-0">
                        {right}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SideCard({ className, href, ...props }: SideCardProps) {
    const baseClass = classNames(
        'overflow-hidden rounded-xl bg-background card-fade-up shadow-[0_10px_30px_rgba(16,24,40,0.12)] dark:bg-gray-800 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-black/5 dark:border-white/10',
        href && 'group block transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className
    );

    if (href) {
        return (
            <Link href={href} className={baseClass}>
                <Inner {...props} imageHref={undefined} interactive />
            </Link>
        );
    }

    return (
        <article className={baseClass}>
            <Inner {...props} />
        </article>
    );
}
