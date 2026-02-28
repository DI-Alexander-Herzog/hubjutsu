import { FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormContainer from '@/Components/FormContainer';
import FormSection from '@/Components/FormSection';
import Input from '@/Components/Input';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface MediaEditProps {
  media: Record<string, any>;
  isAttached: boolean;
}

function getMediaUrl(media: Record<string, any>): string | null {
  if (typeof media?.url === 'string' && media.url) return media.url;
  if (typeof media?.src === 'string' && media.src) return media.src;
  if (typeof media?.original_url === 'string' && media.original_url) return media.original_url;
  if (typeof media?.path === 'string' && media.path) return media.path;
  if (typeof media?.thumbnail === 'string' && media.thumbnail) return media.thumbnail;
  if (media?.storage === 'public' && typeof media?.filename === 'string' && media.filename) {
    const filename = media.filename.startsWith('/') ? media.filename : `/${media.filename}`;
    return `/storage${filename}`;
  }
  return null;
}

export default function MediaEdit({ media, isAttached }: MediaEditProps) {
  const { data, setData, put, processing, errors } = useForm({
    name: media?.name ?? '',
    description: media?.description ?? '',
    tags: Array.isArray(media?.tags) ? media.tags.join(', ') : media?.tags ?? '',
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    put(route('media.update', [media.id]));
  };

  const mediaUrl = getMediaUrl(media);
  const mimeType = typeof media?.mimetype === 'string' ? media.mimetype : '';

  return (
    <AuthenticatedLayout
      title="Media Edit"
      breadcrumbs={[
        { label: 'Dashboard', url: route('dashboard') },
        { label: `Media #${media?.id ?? ''}` },
      ]}
    >
      <form onSubmit={submit} className="space-y-4">
        <FormContainer className="max-w-4xl">
          <FormSection title="Datei" subtitle="Basisinformationen">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input inputName="name" useForm={{ data, setData, errors }} />
              <Input inputName="tags" useForm={{ data, setData, errors }} />
            </div>
            <Input inputName="description" type="textarea" useForm={{ data, setData, errors }} />
          </FormSection>

          <FormSection title="Status" subtitle="Zuordnung">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">Preview</div>
              {mediaUrl && mimeType.startsWith('image/') && (
                <img src={mediaUrl} alt={media?.name ?? 'Media preview'} className="max-h-72 rounded border border-secondary/20" />
              )}
              {mediaUrl && mimeType.startsWith('video/') && (
                <video src={mediaUrl} controls className="max-h-72 w-full rounded border border-secondary/20 bg-black" />
              )}
              {mediaUrl && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded border border-secondary/30 px-3 py-2 text-sm text-secondary hover:bg-secondary/10"
                >
                  Datei öffnen
                </a>
              )}
              {!mediaUrl && <div className="text-xs text-text-500 dark:text-gray-400">Keine Preview verfügbar.</div>}
            </div>

            <div className="text-sm text-text-700 dark:text-gray-300">
              {isAttached ? 'Dieses Medium ist bereits zugeordnet.' : 'Dieses Medium ist noch nicht zugeordnet.'}
            </div>
            <div className="text-xs text-text-500 dark:text-gray-400">
              Datei: {media?.filename || '-'} ({media?.mimetype || 'unbekannt'})
            </div>
            <div className="text-xs text-text-500 dark:text-gray-400">
              Kategorie: {media?.category || '-'}
            </div>
          </FormSection>
        </FormContainer>

        <FormSection boxed={true}>
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" disabled={processing}>
              Speichern
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => window.history.back()}>
              Zurück
            </SecondaryButton>
          </div>
        </FormSection>
      </form>
    </AuthenticatedLayout>
  );
}
