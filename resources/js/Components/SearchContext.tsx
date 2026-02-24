import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

type SearchCtx = {
  query: string;       // entprellt (debounced)
  raw: string;         // sofortiger Wert
  setRaw: (v: string) => void;
  searchEverywhere: (term?: string) => Promise<any[]>;
  setSearchEverywhereHandler: (handler?: ((term: string) => Promise<any[]> | any[])) => void;
};

const SearchContext = createContext<SearchCtx | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [searchEverywhereHandler, setSearchEverywhereHandler] = useState<((term: string) => Promise<any[]> | any[]) | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(raw), 300); // 300ms Delay
    return () => clearTimeout(handle);
  }, [raw]);

  const searchEverywhere = async (term?: string): Promise<any[]> => {
    const searchTerm = (term ?? raw).trim();
    if (!searchTerm) return [];

    if (searchEverywhereHandler) {
      const result = await searchEverywhereHandler(searchTerm);
      return Array.isArray(result) ? result : [];
    }

    const response = await axios.get(route('api.model.global_search'), {
      params: { q: searchTerm },
    });

    return Array.isArray(response.data?.results) ? response.data.results : [];
  };

  return (
    <SearchContext.Provider value={{ query, raw, setRaw, searchEverywhere, setSearchEverywhereHandler }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
}
