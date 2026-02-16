import InputLabel from "@/Components/InputLabel";
import InputText from "@/Components/InputText";
import InputError from "@/Components/InputError";
import { UseForm } from "@/types";
import { useFormContext, useOptionalFormContext } from "@/Components/FormContext";
import InputTextarea from "@/Components/InputTextarea";
import MediaUpload from "./MediaUpload";
import ColorInput from "./ColorInput";
import ModelSelect from "./ModelSelect";
import { Select } from "@headlessui/react";
import InputSelect from "./InputSelect";
import { DateTime } from "luxon";




export default function Input({ className = '', label='', inputId = '', inputName = '', useForm=undefined, type = "text", options=[], isFirst: _isFirst = false, ...props }:{
    className?: string,
    label?: string,
    inputId?: string,
    inputName: string,
    useForm?: UseForm,
    type?: string,
    options?: [value:string, label:string][],
    isFirst?: boolean
    [key: string]: any
}) {

    const id = inputId || inputName;

    const _useForm = useForm || useFormContext().form;
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
                <InputError message={_useForm.errors ? _useForm.errors[inputName] : ''} className="mt-2" />
            </div>
        </div>
    }

    if (type == "boolean" || type == "toggle") {
        const checked = _useForm.data && _useForm.data[inputName] ? true : false;

        return <div className="space-y-1 w-full">
            <div className="flex items-center">
                <label className={"inline-flex items-center cursor-pointer align-middle"} htmlFor={id}>
                    <input 
                        id={id}
                        name={inputName} 
                        type="checkbox" 
                        value="1" 
                        className="sr-only peer" 
                        checked={checked} 
                        onChange={(e) => _useForm.setData((data: { [key: string]: any }) => {
                        return {
                            ...data,
                            [inputName]: !checked
                        }
                    })}
                    disabled={props.disabled}
                    />
                    <div className={
                        "relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 " +
                        "rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white " + 
                        "after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full " +
                        "after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 dark:peer-checked:bg-primary-600 "
                    }></div>
                    <span className="ml-2">{label || inputName.charAt(0).toUpperCase() + inputName.slice(1) }</span>
                </label>
                <InputError message={_useForm.errors ? _useForm.errors[inputName] : ''} className="mt-2" />
            </div>

        </div>
    }

    const editor = (() => {
         if (type == "select") {
            return <InputSelect
                id={id}
                name={inputName}
                value={_useForm.data && _useForm.data[inputName] ? _useForm.data[inputName] : '' }
                className={`mt-1 block w-full ${className}`}
                {...props}
                options={options}
                onChange={(e) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: e.target.value
                }))}
            />;
        } else if (type == "textarea") {
            return <InputTextarea
                id={id}
                name={inputName}
                value={_useForm.data && _useForm.data[inputName] ? _useForm.data[inputName] : '' }
                className={`mt-1 block w-full ${className}`}
                {...props}
                onChange={(e) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: e.target.value
                }))}
            />;
        } else if (type == "media") {
            return <MediaUpload
                useForm={_useForm}
                name={inputName}
                className={className}
                label={undefined}
                {...props}
            />;
        } else if (type == "color") {
            return <ColorInput
                id={id}
                value={_useForm.data ? _useForm.data[inputName] : ''}
                className={`mt-1 w-full ${className}`}
                disabled={props.disabled}
                onChange={(val) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: val
                }))}
            />;
        } else if (type == "model") {
            return <ModelSelect
                id={id}
                className={`mt-1 block w-full ${className}`}
                value={_useForm.data ? _useForm.data[inputName] : null}
                onChange={(val) => _useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: val
                }))}
                disabled={props.disabled}
                {...props as any}
            />;
        }

        let value = _useForm.data && _useForm.data[inputName] ? _useForm.data[inputName] : '';
        if (type == "datetime") {
            if (value) {
                value = DateTime.fromISO(value, { zone: "utc" }).setZone("Europe/Vienna").toFormat("yyyy-MM-dd'T'HH:mm:ss");
            }
            props.step = props.step || 1;
        }
        if (type == "date") {
            if (value) {
                value = DateTime.fromISO(value, { zone: "utc" }).setZone("Europe/Vienna").toFormat("yyyy-MM-dd");
            }
        }

        const typemap: Record<string, string> = {
            datetime: "datetime-local"
        }

        const targetValueFilter = (e: any) => {
            let val = e.target.value;
            if (type == "datetime" && val) {
                val = DateTime.fromISO(val, { zone: "Europe/Vienna" }).setZone("utc").toFormat("yyyy-MM-dd'T'HH:mm:ss") + ".000000Z";
            }
            return val;
        }

        return <InputText
            id={id}
            type={typemap[type] || type}
            name={inputName}
            value={value}
            className={`mt-1 block w-full ${className}`}
            {...props}
            onChange={(e) => _useForm.setData((data: { [key: string]: any }) => ({
                ...data,
                [inputName]: targetValueFilter(e)
            }))}
        />

    })();

    return (
        <div className="space-y-1 w-full">
            <InputLabel htmlFor={id} value={label || (inputName.charAt(0).toUpperCase() + inputName.slice(1)) } />
            {editor}
            <InputError message={_useForm.errors ? _useForm.errors[inputName] : ''} className="mt-2" />
        </div>
    );
}
