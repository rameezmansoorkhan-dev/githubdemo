import { FormEvent, useState } from 'react';
import type { SearchParams, SortBy } from '../api/types';

interface Props {
  initial: SearchParams;
  onSearch: (patch: Partial<SearchParams>) => void;
}

const SORTS: { value: SortBy; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'stars', label: 'Stars' },
  { value: 'forks', label: 'Forks' },
  { value: 'recent', label: 'Recently pushed' },
];

export default function SearchForm({ initial, onSearch }: Props) {
  const [language, setLanguage] = useState(initial.language ?? '');
  const [createdAfter, setCreatedAfter] = useState(initial.createdAfter ?? '');
  const [sortBy, setSortBy] = useState<SortBy>(initial.sortBy);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch({
      language: language.trim() || undefined,
      createdAfter: createdAfter || undefined,
      sortBy,
      page: 1,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end"
    >
      <div className="flex flex-col">
        <label htmlFor="language" className="mb-1 text-sm font-medium text-gray-700">
          Language
        </label>
        <input
          id="language"
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="e.g. typescript"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="createdAfter" className="mb-1 text-sm font-medium text-gray-700">
          Created after
        </label>
        <input
          id="createdAfter"
          type="date"
          value={createdAfter}
          onChange={(e) => setCreatedAfter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="sortBy" className="mb-1 text-sm font-medium text-gray-700">
          Sort by
        </label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        Search
      </button>
    </form>
  );
}