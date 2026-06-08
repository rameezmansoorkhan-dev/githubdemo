import { describe, it, expect } from 'vitest';
import { InMemoryCache, cacheKey } from '../src/services/cache.js';

describe('InMemoryCache (SWR + ETag)', () => {
  it('stores and retrieves entries with an etag', () => {
    const cache = new InMemoryCache<number>(1000);
    cache.set('k', 42, 'W/"e1"');
    const entry = cache.get('k');
    expect(entry?.value).toBe(42);
    expect(entry?.etag).toBe('W/"e1"');
  });

  it('marks an entry stale after the ttl elapses', () => {
    const cache = new InMemoryCache<number>(0);
    cache.set('k', 1, null);
    const entry = cache.get('k')!;
    // ttl 0 means freshUntil <= now immediately.
    expect(cache.isStale(entry)).toBe(true);
  });

  it('renew extends the freshness window', () => {
    const cache = new InMemoryCache<number>(10_000);
    cache.set('k', 1, 'e');
    const before = cache.get('k')!.freshUntil;
    cache.renew('k');
    const after = cache.get('k')!.freshUntil;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('builds a stable, order-independent key', () => {
    const a = cacheKey({ language: 'go', page: 1 });
    const b = cacheKey({ page: 1, language: 'go' });
    expect(a).toBe(b);
  });
});