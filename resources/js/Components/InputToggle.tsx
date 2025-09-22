
import classNames from 'classnames';

const ToggleSwitch = ({ 
    checked, 
    onChange, 
    disabled, 
    label 
}: {
    checked: boolean;
    onChange: () => void;
    disabled: boolean;
    label: string;
}) => (
    <button
        type="button"
        onClick={onChange}
        className={classNames(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700',
            disabled && 'opacity-50 cursor-not-allowed'
        )}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={label}
    >
        <span className="sr-only">Toggle correct answer</span>
        <span
            className={classNames(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                checked ? 'translate-x-5' : 'translate-x-0'
            )}
        />
    </button>
);

export default ToggleSwitch;
