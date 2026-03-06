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
  disabled?: boolean;
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
  if (media.id) {
    return route('media.file', [media.id]);
  }
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
  videoOverlay = 'center',
}: {
  previewType: PreviewType;
  preview: string | null;
  mimeType: string;
  sizeClass: string;
  videoOverlay?: 'center' | 'corner';
}) {
  if (previewType === 'image' && preview) {
    return <img src={preview} className={`${sizeClass} rounded object-contain`} />;
  }

  if (previewType === 'video' && preview) {
    return (
      <div className={`${sizeClass} relative overflow-hidden rounded bg-black`}>
        <video
          src={preview}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        {videoOverlay === 'corner' ? (
          <div className="pointer-events-none absolute bottom-0.5 right-1 text-[11px] leading-none text-white drop-shadow-sm">
            ▶
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
              ▶
            </div>
          </div>
        )}
      </div>
    );
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

function getFilesFromClipboard(clipboardData: DataTransfer | null | undefined): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];

  if (clipboardData.items?.length) {
    for (const item of Array.from(clipboardData.items)) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  if (!files.length && clipboardData.files?.length) {
    files.push(...Array.from(clipboardData.files));
  }

  return files;
}

function basename(path?: string | null): string {
  if (!path) return '';
  const normalized = String(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function isAssignedMedia(media?: Record<string, any> | null): boolean {
  return Boolean(media && media.mediable_id && media.mediable_type);
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
  disabled = false,
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
  const [pasteActive, setPasteActive] = useState(false);
  const isAttached = Boolean(
    currentValue &&
      typeof currentValue === 'object' &&
      !isMediaMarkedForDeletion(currentValue) &&
      currentValue.mediable_id &&
      currentValue.mediable_type
  );
  const attachedMediaId =
    currentValue && typeof currentValue === 'object' && currentValue.id
      ? currentValue.id
      : null;

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
    if (disabled) return;
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
    if (!pasteActive || disabled) return;

    const handleDocumentPaste = (event: ClipboardEvent) => {
      const files = getFilesFromClipboard(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      onDrop(files);
    };

    document.addEventListener('paste', handleDocumentPaste);
    return () => document.removeEventListener('paste', handleDocumentPaste);
  }, [pasteActive, disabled]);

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
    if (disabled) return;
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

  const handleEdit = () => {
    if (!isAttached || !attachedMediaId || disabled) return;
    const shouldNavigate = window.confirm(
      'Zum Media Edit wechseln? Aktuelle Änderungen gehen womöglich verloren.'
    );
    if (!shouldNavigate) return;
    window.location.assign(route('media.edit', [attachedMediaId]));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple: false,
    disabled,
    noClick: disabled,
    noDrag: disabled,
    noKeyboard: disabled,
  });

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block font-semibold text-sm">{label}</label>}

      <div className="flex items-start gap-3">
        {previewType &&
          renderFilePreview({
            previewType,
            preview,
            mimeType: previewMimeType,
            sizeClass: 'h-24 w-24',
          })}

        <div className="flex-1 space-y-2">
          <div
            {...getRootProps({
              tabIndex: disabled ? -1 : 0,
              onMouseEnter: () => setPasteActive(true),
              onMouseLeave: () => setPasteActive(false),
              onFocus: () => setPasteActive(true),
              onBlur: () => setPasteActive(false),
            })}
            className={`border border-dashed border-secondary/40 p-4 rounded text-center transition-colors ${
              isDragActive ? 'bg-secondary/10' : 'bg-background dark:bg-gray-900'
            } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <p className="text-secondary">
              {disabled ? 'Datei-Upload gesperrt' : isDragActive ? t('media.drop_file') : t('media.select_or_drag_file')}
            </p>
            {!disabled && (
              <p className="mt-1 text-xs text-secondary/70">
                {t('Tipp: Bild/Datei mit Strg+V (Cmd+V) einfügen')}
              </p>
            )}
          </div>

          {progress > 0 && progress < 100 && (
            <div className="w-full h-2 rounded bg-secondary/20">
              <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          {(previewType || currentValue) && (
            <div className="flex items-center gap-3">
              {isAttached && (
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-secondary/80"
                  onClick={handleEdit}
                  disabled={disabled}
                >
                  {t('Bearbeiten')}
                </button>
              )}
              <button
                type="button"
                className="text-xs text-tertiary hover:text-tertiary/80"
                onClick={handleRemove}
                disabled={disabled}
              >
                {t('media.remove_file')}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMediaMarkedForDeletion(currentValue) && (
        <p className="text-xs italic text-text-500">{t('media.file_will_be_removed')}</p>
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
  disabled = false,
}: Props) {
  const { t } = useLaravelReactI18n();
  const [pasteActive, setPasteActive] = useState(false);

  const extractInitialValue = () => {
    if (Array.isArray(attributes.value)) {
      return attributes.value;
    }
    if (Array.isArray(useForm?.data?.[name])) {
      return useForm.data[name];
    }
    return [];
  };

  const buildMediaSignature = (list: Record<string, any>[]) =>
    JSON.stringify(
      list.map((media: any) =>
        media?.id
          ? `${media.id}:${isMediaMarkedForDeletion(media) ? 'del' : 'keep'}:${media.mediable_sort ?? ''}`
          : `${media?.filename ?? media?.name ?? ''}:${isMediaMarkedForDeletion(media) ? 'del' : 'keep'}:${media?.mediable_sort ?? ''}`
      )
    );

  const initialValue = extractInitialValue();
  const initialDeleteOps = initialValue.filter((media: any) => isMediaMarkedForDeletion(media));
  const initialUploaded = initialValue.filter((media: any) => !isMediaMarkedForDeletion(media));

  const [items, setItems] = useState<MultiUploadItem[]>(() =>
    initialUploaded.map((media: any) => createUploadedItem(media))
  );
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [deleteOps, setDeleteOps] = useState<Record<string, any>[]>(initialDeleteOps);
  const [err, setErr] = useState<string | null>(null);
  const signatureRef = useRef<string>(buildMediaSignature(initialValue));

  useEffect(() => {
    if (!useForm) return;
    const formValue = useForm.data?.[name];
    if (!Array.isArray(formValue)) return;
    const signature = buildMediaSignature(formValue);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    setItems(
      formValue
        .filter((media: any) => !isMediaMarkedForDeletion(media))
        .map((media: any) => createUploadedItem(media))
    );
    setDeleteOps(formValue.filter((media: any) => isMediaMarkedForDeletion(media)));
  }, [useForm?.data?.[name]]);

  useEffect(() => {
    const medias = items
      .filter((item) => item.status === 'uploaded' && item.media && !isMediaMarkedForDeletion(item.media))
      .map((item, index) => ({
        ...(item.media as Record<string, any>),
        mediable_sort: index + 1,
      }));
    const payload = [...medias, ...deleteOps];
    const signature = buildMediaSignature(payload);
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      if (useForm) {
        useForm.setData((data: any) => ({
          ...data,
          [name]: payload,
        }));
      }
      onChange?.({
        target: { name, value: payload },
      } as unknown as SyntheticEvent);
    }
  }, [items, deleteOps]);

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
          if (uploaded?.id) {
            setDeleteOps((ops) => ops.filter((op) => op?.id !== uploaded.id));
          }
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
    if (disabled) return;
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
        const maxErrorText = String(
          t('Es können maximal {{count}} Dateien hochgeladen werden.', { count: maxFiles })
        ).replace(/\{\{\s*count\s*\}\}/g, String(maxFiles));
        syncError(maxErrorText);
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

  useEffect(() => {
    if (!pasteActive || disabled) return;

    const handleDocumentPaste = (event: ClipboardEvent) => {
      const files = getFilesFromClipboard(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      handleDrop(files);
    };

    document.addEventListener('paste', handleDocumentPaste);
    return () => document.removeEventListener('paste', handleDocumentPaste);
  }, [pasteActive, disabled, items.length, maxFiles]);

  const removeItem = (id: string) => {
    if (disabled) return;
    setItems((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.tempPreview && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      if (item?.media?.id) {
        setDeleteOps((ops) => {
          if (ops.some((op) => op?.id === item.media?.id)) {
            return ops;
          }
          return [...ops, markMediaForDeletion(item.media)];
        });
      }
      return prev.filter((entry) => entry.id !== id);
    });
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    if (disabled) return;
    setItems((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const moveItemByDrop = (sourceId: string, targetId: string) => {
    if (disabled) return;
    if (!sourceId || !targetId || sourceId === targetId) return;

    setItems((prev) => {
      const sourceIndex = prev.findIndex((entry) => entry.id === sourceId);
      const targetIndex = prev.findIndex((entry) => entry.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleEditMedia = (item: MultiUploadItem) => {
    if (disabled) return;
    if (!isAssignedMedia(item.media) || !item.media?.id) return;
    const shouldNavigate = window.confirm(
      'Zum Media Edit wechseln? Aktuelle Änderungen gehen womöglich verloren.'
    );
    if (!shouldNavigate) return;
    window.location.assign(route('media.edit', [item.media.id]));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple: true,
    disabled,
    noClick: disabled,
    noDrag: disabled,
    noKeyboard: disabled,
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <label className="block font-semibold text-sm">{label}</label>}

      <div
        {...getRootProps({
          tabIndex: disabled ? -1 : 0,
          onMouseEnter: () => setPasteActive(true),
          onMouseLeave: () => setPasteActive(false),
          onFocus: () => setPasteActive(true),
          onBlur: () => setPasteActive(false),
        })}
        className={`border border-dashed border-secondary/40 p-4 rounded text-center text-sm transition-colors ${
          isDragActive ? 'bg-secondary/10' : 'bg-background dark:bg-gray-900'
        } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        <p className="font-medium text-secondary">
          {disabled ? 'Datei-Upload gesperrt' : isDragActive ? t('Dateien hier ablegen…') : t('Dateien auswählen oder hier ablegen')}
        </p>
        {!disabled && (
          <p className="mt-1 text-xs text-secondary/70">
            {t('Tipp: Bild/Datei mit Strg+V (Cmd+V) einfügen')}
          </p>
        )}
        {maxFiles && (
          <p className="text-xs text-secondary/70">
            {String(t('Max. {{count}} Dateien', { count: maxFiles })).replace(/\{\{\s*count\s*\}\}/g, String(maxFiles))}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              draggable={!disabled && item.status !== 'uploading'}
              onDragStart={(event) => {
                if (disabled || item.status === 'uploading') return;
                setDraggedItemId(item.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
              }}
              onDragOver={(event) => {
                if (disabled) return;
                if (item.status === 'uploading') return;
                event.preventDefault();
                if (dragOverItemId !== item.id) {
                  setDragOverItemId(item.id);
                }
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                if (disabled) return;
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain') || draggedItemId || '';
                moveItemByDrop(sourceId, item.id);
                setDraggedItemId(null);
                setDragOverItemId(null);
              }}
              onDragEnd={() => {
                if (disabled) return;
                setDraggedItemId(null);
                setDragOverItemId(null);
              }}
              className={`rounded border px-3 py-2 text-sm dark:border-gray-700 ${
                dragOverItemId === item.id ? 'border-primary bg-primary/5' : 'border-gray-200'
              } ${!disabled && item.status !== 'uploading' ? 'cursor-move' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {renderFilePreview({
                    previewType: item.previewType,
                    preview: item.preview,
                    mimeType: item.mimeType,
                    sizeClass: 'h-10 w-10',
                    videoOverlay: 'corner',
                  })}
                  <div className="min-w-0 flex-1">
                    <p className="block w-full truncate font-medium text-text-800 dark:text-gray-100" title={item.fileName}>
                      {item.media?.name || item.fileName}
                    </p>
                    {item.status === 'error' ? (
                      <p className="text-xs text-tertiary">{item.error}</p>
                    ) : (
                      <p className="text-xs text-text-500">
                        {item.status === 'uploaded'
                          ? t('Bereit')
                          : `${Math.round(item.progress)}% ${t('hochgeladen')}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'uploaded' && isAssignedMedia(item.media) && (
                    <button
                      type="button"
                      className="text-xs text-secondary hover:text-secondary/80 disabled:opacity-50"
                      onClick={() => handleEditMedia(item)}
                      disabled={disabled}
                    >
                      {t('Bearbeiten')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-secondary hover:text-secondary/80 disabled:opacity-50"
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={disabled || item.status === 'uploading' || items[0]?.id === item.id}
                    title={t('Nach oben')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs text-secondary hover:text-secondary/80 disabled:opacity-50"
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={disabled || item.status === 'uploading' || items[items.length - 1]?.id === item.id}
                    title={t('Nach unten')}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs text-tertiary hover:text-tertiary/80 disabled:opacity-50"
                    onClick={() => removeItem(item.id)}
                    disabled={disabled || item.status === 'uploading'}
                  >
                    {t('Entfernen')}
                  </button>
                </div>
              </div>

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
    fileName: media?.name || basename(media?.filename) || 'Datei',
    preview: mediaPreview?.preview ?? null,
    previewType: mediaPreview?.previewType ?? 'file',
    mimeType: mediaPreview?.mimeType ?? DEFAULT_MIME_TYPE,
    progress: 100,
    status: 'uploaded',
    media,
    error: null,
  };
}
