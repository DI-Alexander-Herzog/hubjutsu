import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FileUpload, FileUploadErrorEvent, FileUploadProps } from 'primereact/fileupload';
import { forwardRef, useEffect, useRef, InputHTMLAttributes, useState, RefObject, SyntheticEvent } from 'react';
import { UseForm, Arr } from "@/types";
import InputError from './InputError';

interface ExtendedFileUploadErrorEvent extends FileUploadErrorEvent, React.SyntheticEvent<HTMLInputElement> {}

export default forwardRef(function MediaUpload(
  { attributes, className = '', name, onChange, useForm, mode="basic", label, ...props }: { attributes?: Arr, className?:string, useForm?: UseForm, mode?: 'basic' | 'advanced', name: string, label?: string, onChange?: (event: SyntheticEvent) => void } & FileUploadProps,
  ref
) {
    const { t } = useLaravelReactI18n();

    const [previewSrc, setPreviewSrc] = useState(useForm?.data &&  useForm.data[name] && useForm.data[name].thumbnail ? useForm?.data[name].thumbnail : "");
    const [err, setErr] = useState("");


    const [buttonLabel, setButtonLabel] = useState(t('Select file'));
    

    const onUpload = ({ xhr, files } : {xhr: XMLHttpRequest, files: any}) => {
        const ret = {
            target: {
                files: files,
            },
            ...JSON.parse(xhr.responseText),
        };
        
        if (ret[name]) {
            setPreviewSrc(ret[name].thumbnail);
            setButtonLabel(ret[name].name);
        } else {
            setPreviewSrc("");
            setButtonLabel(t('Select file'));
        }
        
        useForm?.setData((data: { [key: string]: any }) => {
            return {
                ...data,
                [name]: ret[name]
            };
        });
    };

    const onError = (event: ExtendedFileUploadErrorEvent) => {

        try {
            let res = JSON.parse(event.xhr.responseText);
            setErr('ERROR: ' + res.message);
        } catch (e) {
            console.error('onError', event.xhr);
            setErr(event.xhr.responseText);
        }
        setPreviewSrc("");
    };

    const onBeforeSend = ({ xhr, formData } : {xhr: XMLHttpRequest, formData: any}) => {
        const { xsrfCookieName, xsrfHeaderName } = window.axios.defaults;

        setErr("");

        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Accept', 'application/json');

        const csrftoken = decodeURIComponent(
            document.cookie.replace(new RegExp('^.*' + xsrfCookieName + '=([^;]*).*$'), '$1'),
        );
        xhr.setRequestHeader(xsrfHeaderName as string, csrftoken);
    };

    return (
        <div className="space-y-1">
            
            {previewSrc && <img src={previewSrc} className="w-24 h-24 object-contain" />}

            <FileUpload
                url={ route('media.upload', { ...attributes }) }
                onBeforeSend={onBeforeSend}
                onUpload={onUpload}
                onError={onError}
                chooseLabel={buttonLabel}
                mode={mode}
                auto={mode == 'basic'}
                className='w-max'
                name={name}
                {...props}
            />

            <InputError message={err || (useForm?.errors ? useForm.errors[name] as string : '') } className="mt-2" />
        </div>
    );

});
 