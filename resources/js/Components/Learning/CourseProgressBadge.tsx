import IconLibrary from '@/Components/IconLibrary';
import classNames from 'classnames';

type CourseProgressStatus = 'not_started' | 'started' | 'finished' | 'completed';

const STATUS_CONFIG: Record<CourseProgressStatus, { label: string; icon: string; className: string }> = {
    not_started: {
        label: 'Nicht gestartet',
        icon: 'play-circle',
        className: 'bg-gray-200/70 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    started: {
        label: 'Gestartet',
        icon: 'clock',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    },
    finished: {
        label: 'Beendet',
        icon: 'flag',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
    completed: {
        label: 'Abgeschlossen',
        icon: 'check-circle',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
};

export default function CourseProgressBadge({
    status = 'not_started',
    progressPercent = 0,
}: {
    status?: CourseProgressStatus;
    progressPercent?: number;
}) {
    const resolvedStatus = STATUS_CONFIG[status] ? status : 'not_started';
    const config = STATUS_CONFIG[resolvedStatus];
    const clampedProgress = Math.max(0, Math.min(100, progressPercent || 0));
    const showProgressLabel = resolvedStatus !== 'not_started';
    const showProgressBar = resolvedStatus !== 'not_started';

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={classNames(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        config.className
                    )}
                >
                    <IconLibrary name={config.icon} size="xs" />
                    <span>{config.label}</span>
                </span>
                {showProgressLabel && (
                    <span className="text-xs text-text-500 dark:text-gray-400">
                        {clampedProgress}% Fortschritt
                    </span>
                )}
            </div>

            {showProgressBar && (
                <div className="h-1.5 w-full rounded-full bg-background-600 dark:bg-gray-700">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${clampedProgress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
