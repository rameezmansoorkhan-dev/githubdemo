import type { ReposResponse, SearchParams } from './types';

export interface ApiError {
  message: string;
  code: string;
}

/**
 * Fetch ranked repositories. Accepts an AbortSignal so the caller can cancel
 * in-flight requests when filters change (prevents stale-response races).
 */
export async function fetchRepositories(
  params: SearchParams,
  signal?: AbortSignal
): Promise<ReposResponse> {
  const qs = new URLSearchParams();
  if (params.language) qs.set('language', params.language);
  if (params.createdAfter) qs.set('createdAfter', params.createdAfter);
  qs.set('sortBy', params.sortBy);
  qs.set('page', String(params.page));
  qs.set('perPage', String(params.perPage));

  const res = await fetch(`/api/repositories?${qs.toString()}`, { signal });

  if (!res.ok) {
    let body: { error?: ApiError } = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse failures
    }
    throw {
      message: body.error?.message ?? `Request failed (${res.status}).`,
      code: body.error?.code ?? 'UNKNOWN',
    } satisfies ApiError;
  }

  return res.json() as Promise<ReposResponse>;
}