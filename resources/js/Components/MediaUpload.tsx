import { useLaravelReactI18n } from 'laravel-react-i18n';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  SyntheticEvent,
} from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import InputError from './InputError';
import { markMediaForDeletion, isMediaMarkedForDeletion } from '../constants/media';

interface Props {
  useForm?: any;
  className?: string;
  name: string;
  label?: string;
  attributes?: Record<string, any>;
  onChange?: (event: SyntheticEvent) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

interface MultiUploadItem {
  id: string;
  fileName: string;
  preview: string | null;
  tempPreview?: boolean;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  media?: Record<string, any> | null;
  error?: string | null;
}

const BaseMediaUpload = forwardRef<HTMLDivElement, Props>(function BaseMediaUpload(props, ref) {
  if (props.multiple) {
    return <MultipleMediaUpload {...props} />;
  }

  return <SingleMediaUpload {...props} />;
});

export default BaseMediaUpload;

function SingleMediaUpload({
  useForm,
  className = '',
  name,
  label,
  attributes = {},
  onChange,
  accept,
}: Props) {
  const { t } = useLaravelReactI18n();
  const [file, setFile] = useState<File | null>(null);
  const currentValue = attributes.value !== undefined ? attributes.value : useForm?.data?.[name];
  const [preview, setPreview] = useState<string | null>(
    isMediaMarkedForDeletion(currentValue) ? null : currentValue?.thumbnail || null
  );
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
            if (!e.total) return;
            const percent = Math.min(100, ((i + e.loaded / e.total) / totalChunks) * 100);
            setProgress(percent);
          },
        });

        if (res.data.done) {
          const result = res.data.media;
          setPreview(result.thumbnail ?? null);
          if (useForm) {
            useForm.setData((data: any) => ({ ...data, [name]: result }));
          }
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
    setErr(null);
    upload(f);
  };

  useEffect(() => {
    if (!useForm) return;
    const value = useForm.data?.[name];
    if (isMediaMarkedForDeletion(value)) {
      setPreview(null);
      setFile(null);
    } else if (value?.thumbnail) {
      setPreview(value.thumbnail);
    }
  }, [useForm?.data?.[name]]);

  const handleRemove = () => {
    const marked = markMediaForDeletion(currentValue);
    setPreview(null);
    setProgress(0);
    setErr(null);
    if (useForm) {
      useForm.setData((data: any) => ({ ...data, [name]: marked }));
    }
    onChange?.({
      target: { name, value: marked },
    } as unknown as SyntheticEvent);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple: false,
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

      {(preview || currentValue) && (
        <button
          type="button"
          className="text-xs text-red-500 hover:text-red-600"
          onClick={handleRemove}
        >
          {t('Remove file')}
        </button>
      )}
      {isMediaMarkedForDeletion(currentValue) && (
        <p className="text-xs italic text-gray-500">{t('File will be removed')}</p>
      )}

      <InputError
        message={err || (useForm?.errors ? useForm.errors[name] : '')}
        className="mt-2"
      />
    </div>
  );
}

function MultipleMediaUpload({
  useForm,
  className = '',
  name,
  label,
  attributes = {},
  onChange,
  accept,
  maxFiles,
}: Props) {
  const { t } = useLaravelReactI18n();

  const extractInitialValue = () => {
    if (Array.isArray(attributes.value)) {
      return attributes.value;
    }
    if (Array.isArray(useForm?.data?.[name])) {
      return useForm.data[name];
    }
    return [];
  };

  const [items, setItems] = useState<MultiUploadItem[]>(() =>
    extractInitialValue().map((media: any) => createUploadedItem(media))
  );
  const [err, setErr] = useState<string | null>(null);
  const signatureRef = useRef<string>(
    JSON.stringify(extractInitialValue().map((media: any) => media?.id ?? media?.filename ?? media?.name ?? ''))
  );

  useEffect(() => {
    if (!useForm) return;
    const formValue = useForm.data?.[name];
    if (!Array.isArray(formValue)) return;
    const signature = JSON.stringify(
      formValue.map((media: any) => media?.id ?? media?.filename ?? media?.name ?? '')
    );
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    setItems(formValue.map((media: any) => createUploadedItem(media)));
  }, [useForm?.data?.[name]]);

  useEffect(() => {
    const medias = items
      .filter((item) => item.status === 'uploaded' && item.media && !isMediaMarkedForDeletion(item.media))
      .map((item) => item.media as Record<string, any>);
    const signature = JSON.stringify(
      medias.map((media) => media?.id ?? media?.filename ?? media?.name ?? '')
    );
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      if (useForm) {
        useForm.setData((data: any) => ({
          ...data,
          [name]: medias,
        }));
      }
      onChange?.({
        target: { name, value: medias },
      } as unknown as SyntheticEvent);
    }
  }, [items]);

  const syncError = (message: string | null) => {
    setErr(message);
  };

  const uploadFile = useCallback(async (itemId: string, file: File, previewUrl: string | null) => {
    const chunkSize = 1024 * 512;
    const uploadId = uuidv4();
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

    try {
      for (let index = 0; index < totalChunks; index++) {
        const chunk = file.slice(index * chunkSize, (index + 1) * chunkSize);
        const form = new FormData();
        form.append('chunk', chunk);
        form.append('upload_id', uploadId);
        form.append('chunk_index', index.toString());
        form.append('total_chunks', totalChunks.toString());
        form.append('filename', file.name);

        const response = await axios.post('/media/chunked-upload', form, {
          onUploadProgress: (event) => {
            if (!event.total) return;
            const percent = Math.min(100, ((index + event.loaded / event.total) / totalChunks) * 100);
            setItems((prev) =>
              prev.map((item) =>
                item.id === itemId ? { ...item, status: 'uploading', progress: percent } : item
              )
            );
          },
        });

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        if (response.data?.done) {
          const uploaded = response.data.media;
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    media: uploaded,
                    preview: uploaded?.thumbnail ?? item.preview,
                    tempPreview: false,
                    progress: 100,
                    status: 'uploaded',
                    error: null,
                  }
                : item
            )
          );
          break;
        }
      }
    } catch (error) {
      console.error(error);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'error',
                error: 'Upload fehlgeschlagen',
              }
            : item
        )
      );
    } finally {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, []);

  const handleDrop = (accepted: File[]) => {
    if (!accepted.length) return;

    let files = accepted;
    if (maxFiles && items.length >= maxFiles) {
      syncError(t('Maximale Anzahl erreicht.'));
      return;
    }

    if (maxFiles) {
      const remaining = maxFiles - items.length;
      files = accepted.slice(0, Math.max(remaining, 0));
      if (files.length < accepted.length) {
        syncError(t('Es können maximal {{count}} Dateien hochgeladen werden.', { count: maxFiles }));
      } else {
        syncError(null);
      }
    } else {
      syncError(null);
    }

    files.forEach((file) => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const newItem: MultiUploadItem = {
        id: uuidv4(),
        fileName: file.name,
        preview,
        tempPreview: !!preview,
        progress: 0,
        status: 'pending',
        media: null,
        error: null,
      };

      setItems((prev) => [...prev, newItem]);
      uploadFile(newItem.id, file, preview);
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.tempPreview && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((entry) => entry.id !== id);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple: true,
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <label className="block font-semibold text-sm">{label}</label>}

      <div
        {...getRootProps()}
        className={`border border-dashed p-4 rounded cursor-pointer text-center text-sm ${
          isDragActive ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <p className="font-medium text-gray-700">
          {isDragActive ? t('Dateien hier ablegen…') : t('Dateien auswählen oder hier ablegen')}
        </p>
        {maxFiles && (
          <p className="text-xs text-gray-500">{t('Max. {{count}} Dateien', { count: maxFiles })}</p>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                {item.preview ? (
                  <img src={item.preview} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                    {item.fileName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{item.fileName}</p>
                  {item.status === 'error' ? (
                    <p className="text-xs text-red-500">{item.error}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {item.status === 'uploaded'
                        ? t('Bereit')
                        : `${Math.round(item.progress)}% ${t('hochgeladen')}`}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                onClick={() => removeItem(item.id)}
                disabled={item.status === 'uploading'}
              >
                {t('Entfernen')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <InputError
        message={err || (useForm?.errors ? useForm.errors[name] : '')}
        className="mt-2"
      />
    </div>
  );
}

function createUploadedItem(media: Record<string, any>): MultiUploadItem {
  return {
    id: uuidv4(),
    fileName: media?.name || media?.filename || 'Datei',
    preview: media?.thumbnail ?? null,
    progress: 100,
    status: 'uploaded',
    media,
    error: null,
  };
}
