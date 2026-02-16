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

type PreviewType = 'image' | 'video' | 'file';

interface MultiUploadItem {
  id: string;
  fileName: string;
  preview: string | null;
  previewType: PreviewType;
  mimeType: string;
  tempPreview?: boolean;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  media?: Record<string, any> | null;
  error?: string | null;
}

const DEFAULT_MIME_TYPE = 'application/octet-stream';

function normalizeMimeType(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_MIME_TYPE;
}

function getMediaMimeType(media?: Record<string, any> | null): string {
  return normalizeMimeType(media?.mimetype || media?.mime_type || media?.mime);
}

function getMediaUrl(media?: Record<string, any> | null): string | null {
  if (!media) return null;
  if (typeof media.url === 'string' && media.url) return media.url;
  if (typeof media.src === 'string' && media.src) return media.src;
  if (typeof media.original_url === 'string' && media.original_url) return media.original_url;
  if (typeof media.path === 'string' && media.path) return media.path;

  if (media.storage === 'public' && typeof media.filename === 'string' && media.filename) {
    const filename = media.filename.startsWith('/') ? media.filename : `/${media.filename}`;
    return `/storage${filename}`;
  }

  return null;
}

function resolvePreviewFromMedia(media?: Record<string, any> | null) {
  if (!media || typeof media !== 'object') {
    return null;
  }

  const hasMediaPayload = Boolean(
    media.id ||
      media.filename ||
      media.url ||
      media.src ||
      media.original_url ||
      media.path ||
      media.thumbnail ||
      media.mimetype ||
      media.mime_type ||
      media.mime
  );

  if (!hasMediaPayload) {
    return null;
  }

  const mimeType = getMediaMimeType(media);
  const mediaUrl = getMediaUrl(media);
  const thumbnail = typeof media?.thumbnail === 'string' && media.thumbnail ? media.thumbnail : null;

  if (mimeType.startsWith('image/')) {
    return {
      previewType: 'image' as const,
      preview: thumbnail || mediaUrl,
      mimeType,
    };
  }

  if (mimeType.startsWith('video/') && mediaUrl) {
    return {
      previewType: 'video' as const,
      preview: mediaUrl,
      mimeType,
    };
  }

  return {
    previewType: 'file' as const,
    preview: null,
    mimeType,
  };
}

function resolvePreviewFromFile(file: File) {
  const mimeType = normalizeMimeType(file.type);

  if (mimeType.startsWith('image/')) {
    return {
      previewType: 'image' as const,
      preview: URL.createObjectURL(file),
      mimeType,
    };
  }

  if (mimeType.startsWith('video/')) {
    return {
      previewType: 'video' as const,
      preview: URL.createObjectURL(file),
      mimeType,
    };
  }

  return {
    previewType: 'file' as const,
    preview: null,
    mimeType,
  };
}

function renderFilePreview({
  previewType,
  preview,
  mimeType,
  sizeClass,
}: {
  previewType: PreviewType;
  preview: string | null;
  mimeType: string;
  sizeClass: string;
}) {
  if (previewType === 'image' && preview) {
    return <img src={preview} className={`${sizeClass} rounded object-contain`} />;
  }

  if (previewType === 'video' && preview) {
    return <video src={preview} className={`${sizeClass} rounded object-cover`} muted playsInline preload="metadata" />;
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded border border-secondary/30 bg-secondary/10 px-1 text-center`}
      title={mimeType}
    >
      <span className="text-[9px] leading-tight text-secondary break-all">
        {mimeType === DEFAULT_MIME_TYPE ? 'Datei' : mimeType}
      </span>
    </div>
  );
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
  const initialPreviewState = isMediaMarkedForDeletion(currentValue)
    ? null
    : resolvePreviewFromMedia(currentValue);
  const [preview, setPreview] = useState<string | null>(initialPreviewState?.preview ?? null);
  const [previewType, setPreviewType] = useState<PreviewType | null>(initialPreviewState?.previewType ?? null);
  const [previewMimeType, setPreviewMimeType] = useState<string>(
    initialPreviewState?.mimeType ?? DEFAULT_MIME_TYPE
  );
  const [progress, setProgress] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (selectedFile: File) => {
    const chunkSize = 1024 * 512; // 512KB

    const uuid = uuidv4();
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const filename = selectedFile.name;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = selectedFile.slice(i * chunkSize, (i + 1) * chunkSize);
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
          const uploadedPreview = resolvePreviewFromMedia(result);
          setPreview(uploadedPreview?.preview ?? null);
          setPreviewType(uploadedPreview?.previewType ?? null);
          setPreviewMimeType(uploadedPreview?.mimeType ?? DEFAULT_MIME_TYPE);
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
    const selectedFile = accepted[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const droppedPreview = resolvePreviewFromFile(selectedFile);
    setPreview(droppedPreview.preview);
    setPreviewType(droppedPreview.previewType);
    setPreviewMimeType(droppedPreview.mimeType);
    setProgress(0);
    setErr(null);
    upload(selectedFile);
  };

  useEffect(() => {
    if (!useForm) return;
    const value = useForm.data?.[name];
    if (isMediaMarkedForDeletion(value)) {
      setPreview(null);
      setPreviewType(null);
      setPreviewMimeType(DEFAULT_MIME_TYPE);
      setFile(null);
    } else if (value) {
      const valuePreview = resolvePreviewFromMedia(value);
      setPreview(valuePreview?.preview ?? null);
      setPreviewType(valuePreview?.previewType ?? null);
      setPreviewMimeType(valuePreview?.mimeType ?? DEFAULT_MIME_TYPE);
    }
  }, [useForm?.data?.[name]]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleRemove = () => {
    const marked = markMediaForDeletion(currentValue);
    setPreview(null);
    setPreviewType(null);
    setPreviewMimeType(DEFAULT_MIME_TYPE);
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

      {previewType &&
        renderFilePreview({
          previewType,
          preview,
          mimeType: previewMimeType,
          sizeClass: 'h-24 w-24',
        })}

      <div
        {...getRootProps()}
        className={`border border-dashed border-secondary/40 p-4 rounded cursor-pointer text-center transition-colors ${
          isDragActive ? 'bg-secondary/10' : 'bg-white dark:bg-gray-900'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-secondary">{isDragActive ? t('Drop file…') : t('Select or drag file here')}</p>
      </div>

      {progress > 0 && progress < 100 && (
        <div className="w-full h-2 rounded bg-secondary/20">
          <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {(previewType || currentValue) && (
        <button
          type="button"
          className="text-xs text-tertiary hover:text-tertiary/80"
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

  const uploadFile = useCallback(async (itemId: string, selectedFile: File, previewUrl: string | null) => {
    const chunkSize = 1024 * 512;
    const uploadId = uuidv4();
    const totalChunks = Math.max(1, Math.ceil(selectedFile.size / chunkSize));

    try {
      for (let index = 0; index < totalChunks; index++) {
        const chunk = selectedFile.slice(index * chunkSize, (index + 1) * chunkSize);
        const form = new FormData();
        form.append('chunk', chunk);
        form.append('upload_id', uploadId);
        form.append('chunk_index', index.toString());
        form.append('total_chunks', totalChunks.toString());
        form.append('filename', selectedFile.name);

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
          const uploadedPreview = resolvePreviewFromMedia(uploaded);
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    media: uploaded,
                    preview: uploadedPreview?.preview ?? null,
                    previewType: uploadedPreview?.previewType ?? 'file',
                    mimeType: uploadedPreview?.mimeType ?? DEFAULT_MIME_TYPE,
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

    files.forEach((selectedFile) => {
      const localPreview = resolvePreviewFromFile(selectedFile);
      const newItem: MultiUploadItem = {
        id: uuidv4(),
        fileName: selectedFile.name,
        preview: localPreview.preview,
        previewType: localPreview.previewType,
        mimeType: localPreview.mimeType,
        tempPreview: !!localPreview.preview,
        progress: 0,
        status: 'pending',
        media: null,
        error: null,
      };

      setItems((prev) => [...prev, newItem]);
      uploadFile(newItem.id, selectedFile, localPreview.preview);
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
        className={`border border-dashed border-secondary/40 p-4 rounded cursor-pointer text-center text-sm transition-colors ${
          isDragActive ? 'bg-secondary/10' : 'bg-white dark:bg-gray-900'
        }`}
      >
        <input {...getInputProps()} />
        <p className="font-medium text-secondary">
          {isDragActive ? t('Dateien hier ablegen…') : t('Dateien auswählen oder hier ablegen')}
        </p>
        {maxFiles && (
          <p className="text-xs text-secondary/70">{t('Max. {{count}} Dateien', { count: maxFiles })}</p>
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
                {renderFilePreview({
                  previewType: item.previewType,
                  preview: item.preview,
                  mimeType: item.mimeType,
                  sizeClass: 'h-10 w-10',
                })}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{item.fileName}</p>
                  {item.status === 'error' ? (
                    <p className="text-xs text-tertiary">{item.error}</p>
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
                className="text-xs text-tertiary hover:text-tertiary/80 disabled:opacity-50"
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
  const mediaPreview = resolvePreviewFromMedia(media);
  return {
    id: uuidv4(),
    fileName: media?.name || media?.filename || 'Datei',
    preview: mediaPreview?.preview ?? null,
    previewType: mediaPreview?.previewType ?? 'file',
    mimeType: mediaPreview?.mimeType ?? DEFAULT_MIME_TYPE,
    progress: 100,
    status: 'uploaded',
    media,
    error: null,
  };
}
