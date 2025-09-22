import InputLabel from "@/Components/InputLabel";
import InputText from "@/Components/InputText";
import InputError from "@/Components/InputError";
import { UseForm } from "@/types";
import { useFormContext, useOptionalFormContext } from "@/Components/FormContext";
import InputTextarea from "@/Components/InputTextarea";




export default function Input({ className = '', label='', inputId = '', inputName = '', type = "text",...props }:{
    className?: string,
    label?: string,
    inputId?: string,
    inputName: string,
    useForm?: UseForm,
    type?: string,
    [key: string]: any
}) {

    const id = inputId || inputName;

    const _useForm = props.useForm || useFormContext().form;
    props.disabled = props.disabled || useOptionalFormContext()?.readonly || false;


    if (type == "checkbox") {
        return <div className="space-y-1 w-full">
            <div className="flex items-center">
                <input
                    id={id}
                    name={inputName}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    checked={_useForm.data && _useForm.data[inputName] ? true : false}
                    onChange={(e) => _useForm.setData((data: { [key: string]: any }) => {
                        return {
                            ...data,
                            [inputName]: !data[inputName]
                        }
                    })}
                    disabled={props.disabled}
                />
                <label htmlFor={id} className="ml-3 block text-sm leading-6 ">
                    {label || inputName.charAt(0).toUpperCase() + inputName.slice(1) }
                </label>
            </div>

        </div>
    }

    return (
        <div className="space-y-1  w-full">
            <InputLabel htmlFor={id} value={label || (inputName.charAt(0).toUpperCase() + inputName.slice(1)) } />

            {type == "textarea" && <InputTextarea
                id={id}
                name={inputName}
                value={_useForm.data ? _useForm.data[inputName] : '' }
                className={`mt-1 block w-full ${className}`}
                {...props}
                onChange={(e) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: e.target.value
                }))}
            />}
            
            {type != "textarea" && <InputText
                id={id}
                type={type}
                name={inputName}
                value={_useForm.data ? _useForm.data[inputName] : '' }
                className={`mt-1 block w-full ${className}`}
                {...props}
                onChange={(e) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: e.target.value
                }))}
            />}

            <InputError message={_useForm.errors ? _useForm.errors[inputName] : ''} className="mt-2" />

        </div>
    );
}
