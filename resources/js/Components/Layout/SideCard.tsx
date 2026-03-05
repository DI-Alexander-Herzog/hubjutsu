import classNames from 'classnames';
import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

type SideCardProps = {
    className?: string;
    href?: string;
    imageUrl?: string | null;
    fallbackImageUrl?: string | null;
    imageHref?: string;
    imageAlt?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    right?: ReactNode;
};

function Inner({
    imageUrl,
    fallbackImageUrl,
    imageHref,
    imageAlt,
    title,
    subtitle,
    right,
    interactive = false,
}: Omit<SideCardProps, 'className' | 'href'> & { interactive?: boolean }) {
    const resolvedImageUrl = imageUrl || fallbackImageUrl || null;

    const imageContent = (
        <>
            {resolvedImageUrl ? (
                <img
                    src={resolvedImageUrl}
                    alt={imageAlt || ''}
                    className={classNames(
                        'h-full w-full object-cover transition-transform duration-300 ease-out',
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

    return (
        <div className="flex items-stretch">
            <div className="w-28 shrink-0 self-stretch overflow-hidden bg-background-600 dark:bg-gray-700 sm:w-36">
                {imageHref ? (
                    <a href={imageHref} className="block h-full w-full">
                        {imageContent}
                    </a>
                ) : (
                    imageContent
                )}
            </div>

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
        'overflow-hidden rounded-xl bg-background shadow-sm dark:bg-gray-800',
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
