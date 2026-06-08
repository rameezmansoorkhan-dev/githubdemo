# 2. Query-level caching with ETag conditional requests and stale-while-revalidate

Date: 2025-06-01

## Status
Accepted

## Context
The GitHub Search API is the dominant latency cost (~200–500ms per call) and
is rate limited (~10 req/min unauthenticated, ~30 with a token). Identical
searches are common (pagination, shared links, repeated filters). We need to
reduce both latency and quota consumption without introducing a datastore.

## Decision
Cache at the query level: the key is the normalized set of search params
(language + createdAfter + page + perPage) and the value is the ranked
response plus the GitHub ETag for that query.

- ETag / conditional requests: when an entry exists, the GitHub client sends
  `If-None-Match`. A 304 costs almost nothing against the rate limit and lets
  us reuse cached data; a 200 refreshes both data and stored ETag.
- Stale-while-revalidate: entries carry a freshness window (TTL). A hit within
  the window is served immediately. A hit past the window is ALSO served
  immediately (stale), then a background revalidation runs: 304 renews the
  freshness timestamp, 200 replaces data + ETag. Users never wait on GitHub
  for a previously-seen query, and the cache self-heals.
- The cache sits behind a small interface (get/set/renew/isStale) so the
  in-memory store can be swapped for Redis with a one-line wiring change.
- We deliberately do NOT cache per-repo scores: the recency factor changes
  daily and scoring is sub-millisecond, so caching it adds complexity for no
  meaningful gain.

## Consequences
- Positive: repeat searches are instant; quota consumption drops sharply via
  304s; no datastore required for the core win.
- Negative (stated explicitly): SWR can serve slightly stale recency scores in
  the gap between serving and revalidation. Acceptable for a popularity ranker
  where scores drift slowly day-to-day.
- The in-memory cache is per-instance; running multiple instances requires
  moving to a shared store (Redis) to share cache and avoid duplicated upstream
  calls. The interface already anticipates this.
- A background revalidation failure must not affect the already-served
  response; it is logged at warn level and the stale entry is kept.