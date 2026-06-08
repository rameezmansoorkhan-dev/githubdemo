import { useEffect, useState } from 'react';
import { fetchRepositories, type ApiError } from '../api/client';
import type { ReposResponse, SearchParams } from '../api/types';

interface State {
  data: ReposResponse | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Fetches repositories whenever params change, cancelling any in-flight
 * request via AbortController so stale responses never overwrite newer ones.
 */
export function useRepositories(params: SearchParams): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchRepositories(params, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ data: null, loading: false, error: err as ApiError });
      });

    return () => controller.abort();
  }, [
    params.language,
    params.createdAfter,
    params.sortBy,
    params.page,
    params.perPage,
  ]);

  return state;
}