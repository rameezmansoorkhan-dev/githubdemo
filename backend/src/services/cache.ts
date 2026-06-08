import { env } from '../config/env.js';

/**
 * Swappable cache interface (Redis-ready). The in-memory implementation
 * supports stale-while-revalidate: entries carry a freshness window and an
 * ETag for conditional revalidation. See docs/adr/0002.
 */
export interface CacheEntry<T> {
  value: T;
  etag: string | null;
  /** Epoch ms when this entry becomes stale (still served, then revalidated). */
  freshUntil: number;
  storedAt: number;
}

export interface Cache<T = unknown> {
  get(key: string): CacheEntry<T> | undefined;
  set(key: string, value: T, etag: string | null): void;
  /** Renew freshness window after a 304 (data unchanged). */
  renew(key: string): void;
  isStale(entry: CacheEntry<T>): boolean;
  clear(): void;
}

export class InMemoryCache<T = unknown> implements Cache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number = env.CACHE_TTL_MS) {}

  get(key: string): CacheEntry<T> | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T, etag: string | null): void {
    const now = Date.now();
    this.store.set(key, {
      value,
      etag,
      storedAt: now,
      freshUntil: now + this.ttlMs,
    });
  }

  renew(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.freshUntil = Date.now() + this.ttlMs;
    }
  }

  isStale(entry: CacheEntry<T>): boolean {
    return Date.now() >= entry.freshUntil;
  }

  clear(): void {
    this.store.clear();
  }
}

/** Stable cache key from normalized search params. */
export function cacheKey(parts: Record<string, unknown>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${String(parts[k] ?? '')}`)
    .join('&');
}