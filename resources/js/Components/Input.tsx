import InputLabel from "@/Components/InputLabel";
import InputText from "@/Components/InputText";
import InputError from "@/Components/InputError";
import { UseForm } from "@/types";


export default function Input({ className = '', label='', inputId = '', inputName = '', useForm = {} as UseForm, type = "text", isFirst=false ,...props }) {

    const id = inputId || inputName;
    
    if (type == "checkbox") {
        return <div className="flex items-center">
                <input
                    id={id}
                    name={inputName}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    checked={useForm.data && useForm.data[inputName] ? true : false}
                    onChange={(e) => useForm.setData((data: { [key: string]: any }) => {
                        console.log(e);
                        return {
                            ...data,
                            [inputName]: !data[inputName]
                        }
                    })}
                />
                <label htmlFor={id} className="ml-3 block text-sm leading-6 ">
                    {label || inputName.charAt(0).toUpperCase() + inputName.slice(1) }
                </label>
            </div>
    }

    return (
        <div className="space-y-1">
            <InputLabel className={isFirst ? "mt-0": "mt-4"} htmlFor={id} value={label || inputName.charAt(0).toUpperCase() + inputName.slice(1) } />

            <InputText
                id={id}
                type={type}
                name={inputName}
                value={useForm.data ? useForm.data[inputName] : '' }
                className={`mt-1 block w-full ${className}`}
                {...props}
                onChange={(e) => useForm.setData((data: { [key: string]: any }) => ({
                    ...data,
                    [inputName]: e.target.value
                }))}
            />

            <InputError message={useForm.errors ? useForm.errors[inputName] : ''} className="mt-2" />

        </div>
    );
}
