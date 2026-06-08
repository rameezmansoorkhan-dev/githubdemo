export interface ScoreBreakdown {
  stars: number;
  forks: number;
  recency: number;
}

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

export type SortBy = 'score' | 'stars' | 'forks' | 'recent';

export interface SearchParams {
  language?: string;
  createdAfter?: string;
  sortBy: SortBy;
  page: number;
  perPage: number;
}