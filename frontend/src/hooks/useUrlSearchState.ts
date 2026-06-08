import { useCallback, useState } from 'react';
import type { SearchParams, SortBy } from '../api/types';

const SORT_VALUES: SortBy[] = ['score', 'stars', 'forks', 'recent'];

function readFromUrl(): SearchParams {
  const p = new URLSearchParams(window.location.search);
  const sortBy = p.get('sortBy');
  return {
    language: p.get('language') ?? undefined,
    createdAfter: p.get('createdAfter') ?? undefined,
    sortBy: SORT_VALUES.includes(sortBy as SortBy)
      ? (sortBy as SortBy)
      : 'score',
    page: Number(p.get('page')) || 1,
    perPage: Number(p.get('perPage')) || 30,
  };
}

function writeToUrl(params: SearchParams): void {
  const qs = new URLSearchParams();
  if (params.language) qs.set('language', params.language);
  if (params.createdAfter) qs.set('createdAfter', params.createdAfter);
  qs.set('sortBy', params.sortBy);
  qs.set('page', String(params.page));
  qs.set('perPage', String(params.perPage));
  const url = `${window.location.pathname}?${qs.toString()}`;
  window.history.replaceState(null, '', url);
}

/** URL-driven search state: shareable links, refresh persistence. */
export function useUrlSearchState() {
  const [params, setParams] = useState<SearchParams>(readFromUrl);

  const update = useCallback((patch: Partial<SearchParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      writeToUrl(next);
      return next;
    });
  }, []);

  return { params, update };
}