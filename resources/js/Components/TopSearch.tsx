
import { useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useSearch } from './SearchContext';

export default function TopSearch() {
  const { t } = useLaravelReactI18n();
  const { raw, setRaw, searchEverywhere } = useSearch();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const doSearchEverywhere = async () => {
    const term = raw.trim();
    if (!term) return;
    setLoading(true);
    try {
      const data = await searchEverywhere(term);
      setResults(data);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-1 items-center gap-2" ref={wrapRef}>
      <label htmlFor="search-field" className="sr-only">{t('Suchen')}</label>
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 fill-text dark:fill-white"
      />
      <input
        id="search-field"
        type="search"
        placeholder={t('Suchen...')}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        className="block h-full w-full border-0 py-0 pl-8 pr-0 focus:ring-0 sm:text-sm bg-transparent dark:text-background"
      />
      {raw.trim().length > 0 && (
        <button
          type="button"
          onClick={doSearchEverywhere}
          disabled={loading}
          className="shrink-0 rounded-md border border-gray-300 bg-background px-2 py-1 text-xs text-text-700 hover:border-primary hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          {loading ? t('Suche...') : t('Überall suchen')}
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-10 z-40 rounded-md border border-gray-200 bg-background p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {results.length === 0 ? (
            <div className="px-2 py-2 text-xs text-text-500 dark:text-gray-400">{t('Keine Ergebnisse')}</div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {results.map((group: any, idx: number) => (
                <div key={`${group?.model || 'group'}-${idx}`} className="rounded border border-gray-100 p-1 dark:border-gray-700">
                  <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-500 dark:text-gray-400">
                    {group?.label || group?.model || t('Ergebnisse')}
                  </div>
                  {(group?.items || []).map((item: any) => (
                    <a
                      key={`${item.model}-${item.id}`}
                      href={item.url || '#'}
                      onClick={() => setOpen(false)}
                      className="block rounded px-2 py-1 hover:bg-background-600 dark:hover:bg-gray-700"
                    >
                      <div className="text-sm text-text-900 dark:text-gray-100">{item.title}</div>
                      {item.subtitle ? (
                        <div className="line-clamp-1 text-xs text-text-500 dark:text-gray-400">{item.subtitle}</div>
                      ) : null}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
