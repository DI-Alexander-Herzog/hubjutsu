import IconLibrary from '@/Components/IconLibrary';
import classNames from 'classnames';

export default function ProgressCircle({
    percent = 0,
    size = 72,
    stroke = 6,
    started = false,
    completed = false,
}: {
    percent?: number;
    size?: number;
    stroke?: number;
    started?: boolean;
    completed?: boolean;
}) {
    const clamped = Math.max(0, Math.min(100, percent || 0));
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (clamped / 100) * circumference;

    if (!started && !completed) {
        return (
            <div
                className="inline-flex flex-col items-center justify-center rounded-full border border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-300"
                style={{ width: size, height: size }}
            >
                <IconLibrary name="play" size="xs" />
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">Start</span>
            </div>
        );
    }

    return (
        <div
            className={classNames(
                'relative inline-flex items-center justify-center rounded-full',
                completed
                    ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-background-600 text-text-700 dark:bg-gray-700 dark:text-gray-200'
            )}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="opacity-20"
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-300 ease-out"
                />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
                {completed ? (
                    <IconLibrary name="check" size="sm" className="text-emerald-600 dark:text-emerald-300" />
                ) : (
                    <span className="text-xs font-semibold">{clamped}%</span>
                )}
            </div>
        </div>
    );
}
