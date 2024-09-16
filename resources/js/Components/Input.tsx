import InputLabel from "@/Components/InputLabel";
import InputText from "@/Components/InputText";
import InputError from "@/Components/InputError";


type FormParams = {
    data?: { [key: string]: any };
    setData?: (prevData: { [key: string]: any }) => void;
    errors?: { [key: string]: string };
    [key: string]: any | undefined;
};


export default function Input({ className = '', label='', inputId = '', inputName = '', form = {} as FormParams, type = "text", ...props }) {

    const id = inputId || inputName;

    return (
        <>
            <InputLabel htmlFor={id} value={label || inputName.charAt(0).toUpperCase() + inputName.slice(1) } />

            <InputText
                id={id}
                type={type}
                name={inputName}
                value={form.data ? form.data[inputName] : ''}
                className={`mt-1 block w-full ${className}`}
                {...props}
            />

            <InputError message={form.errors ? form.errors[inputName] : ''} className="mt-2" />

        </>
    );
}
