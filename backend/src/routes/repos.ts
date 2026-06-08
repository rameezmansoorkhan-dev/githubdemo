import { Request, Response, NextFunction, Router } from 'express';
import { validate } from '../middleware/validate.js';
import { repoQuerySchema } from '../types/index.js';
import type {
  RepoQuery,
  Repo,
  ReposResponse,
  GitHubFetchResult,
} from '../types/index.js';
import { searchRepositories } from '../services/github.js';
import { toScoredRepo } from '../services/scoring.js';
import { InMemoryCache, cacheKey } from '../services/cache.js';

const cache = new InMemoryCache<ReposResponse>();
const router = Router();

router.get(
  '/repositories',
  validate(repoQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.query as unknown as RepoQuery;
      const key = cacheKey({
        language: params.language,
        createdAfter: params.createdAfter,
        page: params.page,
        perPage: params.perPage,
      });

      const cached = cache.get(key);

      // Fresh hit: serve immediately.
      if (cached && !cache.isStale(cached)) {
        req.log?.debug({ key }, 'cache_hit_fresh');
        return res.json(sortItems(cached.value, params.sortBy));
      }

      // Stale hit: serve stale now, revalidate in the background (SWR).
      if (cached && cache.isStale(cached)) {
        req.log?.debug({ key }, 'cache_hit_stale_serving');
        void revalidate(key, params, cached.etag, req);
        return res.json(sortItems(cached.value, params.sortBy));
      }

      // Miss: fetch fresh.
      req.log?.debug({ key }, 'cache_miss');
      const fetched = await searchRepositories(params, null);
      const response = buildResponse(fetched);
      cache.set(key, response, fetched.etag);
      return res.json(sortItems(response, params.sortBy));
    } catch (err) {
      next(err);
    }
  }
);

/** Background revalidation: 304 renews freshness, 200 replaces data + etag. */
async function revalidate(
  key: string,
  params: RepoQuery,
  etag: string | null,
  req: Request
): Promise<void> {
  try {
    const fetched = await searchRepositories(params, etag);
    if (fetched.notModified) {
      cache.renew(key);
      req.log?.debug({ key }, 'revalidate_304_renewed');
    } else {
      cache.set(key, buildResponse(fetched), fetched.etag);
      req.log?.debug({ key }, 'revalidate_200_replaced');
    }
  } catch (err) {
    // Background failure must not affect the already-served response.
    req.log?.warn({ key, err }, 'revalidate_failed');
  }
}

function buildResponse(fetched: GitHubFetchResult): ReposResponse {
  const now = new Date();
  const items: Repo[] = fetched.items.map((raw) => toScoredRepo(raw, now));
  return {
    total: Math.min(fetched.total, 1000),
    items,
    rateLimitRemaining: fetched.rateLimitRemaining,
  };
}

/** In-memory ordering over the fetched page (presentation-layer only). */
function sortItems(resp: ReposResponse, sortBy: RepoQuery['sortBy']): ReposResponse {
  const items = [...resp.items];
  switch (sortBy) {
    case 'stars':
      items.sort((a, b) => b.stars - a.stars);
      break;
    case 'forks':
      items.sort((a, b) => b.forks - a.forks);
      break;
    case 'recent':
      items.sort(
        (a, b) =>
          new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
      );
      break;
    case 'score':
    default:
      items.sort((a, b) => b.score - a.score);
  }
  return { ...resp, items };
}

export default router;
export { cache as reposCache };