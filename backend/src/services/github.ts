import axios, { AxiosInstance, isAxiosError } from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';
import type { GitHubFetchResult, GitHubRepoRaw, RepoQuery } from '../types/index.js';

/**
 * GitHub Search API client. Single request per search (no N+1), ETag-aware
 * for cheap conditional revalidation, maps upstream failures to ApiError.
 */
const client: AxiosInstance = axios.create({
  baseURL: env.GITHUB_API_URL,
  timeout: 8000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
      : {}),
  },
});

function buildQuery(params: RepoQuery): string {
  const qualifiers: string[] = [];
  if (params.language) qualifiers.push(`language:${params.language}`);
  if (params.createdAfter) qualifiers.push(`created:>=${params.createdAfter}`);
  // Always include a baseline so GitHub accepts the search.
  if (qualifiers.length === 0) qualifiers.push('stars:>=1');
  return qualifiers.join(' ');
}

interface SearchResponse {
  total_count: number;
  items: GitHubRepoRaw[];
}

export async function searchRepositories(
  params: RepoQuery,
  etag: string | null
): Promise<GitHubFetchResult> {
  const q = buildQuery(params);

  try {
    const res = await client.get<SearchResponse>('/search/repositories', {
      params: {
        q,
        sort: 'stars',
        order: 'desc',
        per_page: params.perPage,
        page: params.page,
      },
      headers: etag ? { 'If-None-Match': etag } : undefined,
      // Treat 304 as a success so we can reuse the cache.
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    });

    const rateLimitRemaining = parseHeaderInt(
      res.headers['x-ratelimit-remaining']
    );

    if (res.status === 304) {
      return {
        items: [],
        total: 0,
        etag,
        rateLimitRemaining,
        notModified: true,
      };
    }

    return {
      items: res.data.items,
      total: res.data.total_count,
      etag: (res.headers['etag'] as string | undefined) ?? null,
      rateLimitRemaining,
      notModified: false,
    };
  } catch (err) {
    throw mapGitHubError(err);
  }
}

function parseHeaderInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapGitHubError(err: unknown): ApiError {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 403 || status === 429) {
      return new ApiError(
        429,
        'GitHub API rate limit exceeded. Please try again shortly.',
        'RATE_LIMITED'
      );
    }
    if (status === 422) {
      return new ApiError(
        400,
        'GitHub rejected the search query (invalid parameters).',
        'VALIDATION_ERROR'
      );
    }
    return new ApiError(
      502,
      'Failed to reach the GitHub API.',
      'UPSTREAM_ERROR'
    );
  }
  return new ApiError(500, 'Unexpected error contacting GitHub.', 'INTERNAL_ERROR');
}