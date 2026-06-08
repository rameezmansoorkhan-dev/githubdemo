import { z } from 'zod';

/** Inbound query schema — single source of truth for params + types. */
export const repoQuerySchema = z
  .object({
    language: z.string().trim().min(1).max(50).optional(),
    createdAfter: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'createdAfter must be YYYY-MM-DD')
      .optional(),
    perPage: z.coerce.number().int().min(1).max(100).default(30),
    page: z.coerce.number().int().min(1).default(1),
    sortBy: z.enum(['score', 'stars', 'forks', 'recent']).default('score'),
  })
  .refine((q) => q.page * q.perPage <= 1000, {
    message: 'page * perPage must not exceed 1000 (GitHub result cap).',
    path: ['page'],
  });

export type RepoQuery = z.infer<typeof repoQuerySchema>;

/** Shape of a single GitHub repo item as returned from the search API. */
export interface GitHubRepoRaw {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
}

export interface ScoreBreakdown {
  stars: number;
  forks: number;
  recency: number;
}

/** Repo shape returned by our API. */
export interface Repo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ReposResponse {
  total: number;
  items: Repo[];
  rateLimitRemaining: number | null;
}

/** Result of a GitHub fetch, including conditional-request metadata. */
export interface GitHubFetchResult {
  items: GitHubRepoRaw[];
  total: number;
  etag: string | null;
  rateLimitRemaining: number | null;
  /** true when GitHub answered 304 Not Modified. */
  notModified: boolean;
}

/** Standard API error envelope used everywhere. */
export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}