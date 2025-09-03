import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SearchCtx = {
  query: string;       // entprellt (debounced)
  raw: string;         // sofortiger Wert
  setRaw: (v: string) => void;
};

const SearchContext = createContext<SearchCtx | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQuery(raw), 300); // 300ms Delay
    return () => clearTimeout(handle);
  }, [raw]);

  return (
    <SearchContext.Provider value={{ query, raw, setRaw }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
}
