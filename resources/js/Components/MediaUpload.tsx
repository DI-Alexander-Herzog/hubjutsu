import { useLaravelReactI18n } from 'laravel-react-i18n';
import { forwardRef, useEffect, useRef, useState, SyntheticEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import InputError from './InputError';

interface Props {
  useForm?: any;
  className?: string;
  name: string;
  label?: string;
  attributes?: Record<string, any>;
  onChange?: (event: SyntheticEvent) => void;
  accept?: string;
}

export default forwardRef(function ChunkedMediaUpload(
  { useForm, className = '', name, label, attributes = {}, onChange, accept }: Props,
  ref
) {
  const { t } = useLaravelReactI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(useForm?.data?.[name]?.thumbnail || null);
  const [progress, setProgress] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    const chunkSize = 1024 * 512; // 512KB

    const uuid = uuidv4();
    const totalChunks = Math.ceil(file.size / chunkSize);
    const filename = file.name;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const form = new FormData();
      form.append('chunk', chunk);
      form.append('upload_id', uuid);
      form.append('chunk_index', i.toString());
      form.append('total_chunks', totalChunks.toString());
      form.append('filename', filename);

      try {
        const res = await axios.post('/media/chunked-upload', form, {
          onUploadProgress: (e) => {
            const percent = Math.min(100, ((i + e.loaded / e.total!) / totalChunks) * 100);
            setProgress(percent);
          },
        });

        if (res.data.done) {
          const result = res.data.media;
          setPreview(result.thumbnail ?? null);
          useForm?.setData((data: any) => ({ ...data, [name]: result }));
          onChange?.({
            target: { name, value: result },
          } as unknown as SyntheticEvent);
        }
      } catch (e: any) {
        console.error(e);
        setErr('Upload fehlgeschlagen');
        break;
      }
    }
  };

  const onDrop = (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    setProgress(0);
    upload(f);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
  });

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block font-semibold text-sm">{label}</label>}

      {preview && <img src={preview} className="w-24 h-24 object-contain" />}

      <div
        {...getRootProps()}
        className={`border border-dashed p-4 rounded cursor-pointer text-center ${
          isDragActive ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <p>{isDragActive ? t('Drop file…') : t('Select or drag file here')}</p>
      </div>

      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 h-2 rounded">
          <div className="bg-blue-600 h-2 rounded" style={{ width: `${progress}%` }} />
        </div>
      )}

      <InputError
        message={err || (useForm?.errors ? useForm.errors[name] : '')}
        className="mt-2"
      />
    </div>
  );
});