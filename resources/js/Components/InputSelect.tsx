import { forwardRef, useEffect, useImperativeHandle, useRef, SelectHTMLAttributes } from 'react';

export default forwardRef(function InputSelect(
    { 
        className = '', 
        isFocused = false, 
        withEmpty = true, 
        options = [], 
        ...props 
    }: SelectHTMLAttributes<HTMLSelectElement> & { 
        isFocused?: boolean, 
        withEmpty?: boolean,
        options: [string, string][]
    },
    ref
) {
    const localRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, []);

    return (
        <select
            {...props}
            className={
                'disabled:border-0 ' + 
                'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-primary-500 dark:focus:border-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 rounded-md shadow-sm ' +
                className
            }
            ref={localRef}
        >
            { withEmpty && <option></option>}
            {options.map( (value, index) => {
              return <option key={index} value={value[0]}>{value[1]}</option>;
            })}
        </select>
    );
});
