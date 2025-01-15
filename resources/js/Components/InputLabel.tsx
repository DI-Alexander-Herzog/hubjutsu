import { LabelHTMLAttributes } from 'react';

export default function InputLabel({ value, className = '', children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
    return (
        <label {...props} className={`dark:text-gray-100 block font-medium text-sm ` + className}>
            {value ? value : children}
        </label>
    );
}
