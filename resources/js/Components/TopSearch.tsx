
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { useSearch } from './SearchContext';

export default function TopSearch() {
  const { query, raw, setRaw } = useSearch();
  return (
    <div className="relative flex flex-1">
      <label htmlFor="search-field" className="sr-only">Search</label>
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 fill-text dark:fill-white"
      />
      <input
        id="search-field"
        type="search"
        placeholder="Search..."
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="block h-full w-full border-0 py-0 pl-8 pr-0 focus:ring-0 sm:text-sm text-gray-300 bg-transparent dark:text-gray-300"
      />
    </div>
  );
}
