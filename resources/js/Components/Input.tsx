import InputLabel from "@/Components/InputLabel";
import InputText from "@/Components/InputText";
import InputError from "@/Components/InputError";


type FormParams = {
    data?: { [key: string]: any };
    setData?: (prevData: { [key: string]: any }) => void;
    errors?: { [key: string]: string };
};


export default function Input({ className = '', inputId = '', inputName = '', form = {} as FormParams, type = "text", ...props }) {
    return (
        <>
            <InputLabel htmlFor={inputName} value={inputName.charAt(0).toUpperCase() + inputName.slice(1)} />

            <InputText
                id={inputName}
                type={type}
                name={inputName}
                value={form.data ? form.data[inputName] : ''}
                className={`mt-1 block w-full ${className}`}
                autoComplete={inputName}
                isFocused={true}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setData && form.setData({ ...form.data, [inputName]: e.target.value })}
                {...props}
            />

            <InputError message={form.errors ? form.errors[inputName] : ''} className="mt-2" />
        </>
    );
}
