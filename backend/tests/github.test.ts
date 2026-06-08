// tests/github.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import nock from 'nock';
import { searchRepositories } from '../src/services/github.js';
import { ApiError } from '../src/middleware/error.js';
import type { RepoQuery } from '../src/types/index.js';

const GITHUB = 'https://api.github.com';

// Minimal RepoQuery factory; override per test.
function query(overrides: Partial<RepoQuery> = {}): RepoQuery {
  return { page: 1, perPage: 30, ...overrides } as RepoQuery;
}

function rawRepo(id: number, stars: number) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    description: 'x',
    language: 'Java',
    stargazers_count: stars,
    forks_count: 1,
    open_issues_count: 0,
    created_at: '2026-05-01T00:00:00Z',
    pushed_at: '2026-05-02T00:00:00Z',
    owner: { login: 'owner', avatar_url: 'https://example/a.png' },
  };
}

beforeAll(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});

describe('searchRepositories — happy path (200)', () => {
  it('returns mapped items, total, etag and rateLimitRemaining', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(
        200,
        { total_count: 2, items: [rawRepo(1, 100), rawRepo(2, 5)] },
        { etag: 'W/"abc"', 'x-ratelimit-remaining': '57' }
      );

    const res = await searchRepositories(query({ language: 'java' }), null);

    expect(scope.isDone()).toBe(true);
    expect(res.notModified).toBe(false);
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(2);
    expect(res.etag).toBe('W/"abc"');
    expect(res.rateLimitRemaining).toBe(57);
  });

  it('returns null etag when GitHub omits the header', async () => {
    nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(200, { total_count: 0, items: [] }); // no etag header

    const res = await searchRepositories(query(), null);
    expect(res.etag).toBeNull();
    expect(res.rateLimitRemaining).toBeNull(); // header absent -> null
  });
});

describe('searchRepositories — query building', () => {
  it('builds a language qualifier', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query((q) => q.q === 'language:go')
      .reply(200, { total_count: 0, items: [] });

    await searchRepositories(query({ language: 'go' }), null);
    expect(scope.isDone()).toBe(true);
  });

  it('combines language and createdAfter qualifiers', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query((q) => q.q === 'language:rust created:>=2026-05-01')
      .reply(200, { total_count: 0, items: [] });

    await searchRepositories(
      query({ language: 'rust', createdAfter: '2026-05-01' }),
      null
    );
    expect(scope.isDone()).toBe(true);
  });

  it('falls back to a baseline qualifier when none are provided', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query((q) => q.q === 'stars:>=1')
      .reply(200, { total_count: 0, items: [] });

    await searchRepositories(query(), null);
    expect(scope.isDone()).toBe(true);
  });
});

describe('searchRepositories — conditional requests (ETag / 304)', () => {
  it('sends If-None-Match when an etag is supplied', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .matchHeader('if-none-match', 'W/"abc"')
      .reply(200, { total_count: 1, items: [rawRepo(1, 10)] }, { etag: 'W/"def"' });

    const res = await searchRepositories(query(), 'W/"abc"');
    expect(scope.isDone()).toBe(true);
    expect(res.etag).toBe('W/"def"');
  });

  it('treats 304 as success and signals notModified', async () => {
    const scope = nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .matchHeader('if-none-match', 'W/"abc"')
      .reply(304, undefined, { 'x-ratelimit-remaining': '55' });

    const res = await searchRepositories(query(), 'W/"abc"');

    expect(scope.isDone()).toBe(true);
    expect(res.notModified).toBe(true);
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.etag).toBe('W/"abc"'); // echoes the supplied etag
    expect(res.rateLimitRemaining).toBe(55);
  });
});

describe('searchRepositories — error mapping', () => {
  it('maps 403 to a 429 RATE_LIMITED ApiError', async () => {
    nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(403, { message: 'rate limit exceeded' });

    await expect(searchRepositories(query(), null)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('maps 429 to a 429 RATE_LIMITED ApiError', async () => {
    nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(429, { message: 'too many requests' });

    await expect(searchRepositories(query(), null)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('maps 422 to a 400 VALIDATION_ERROR ApiError', async () => {
    nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(422, { message: 'Validation Failed' });

    await expect(searchRepositories(query(), null)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('maps any other upstream status to a 502 UPSTREAM_ERROR', async () => {
    nock(GITHUB)
      .get('/search/repositories')
      .query(true)
      .reply(503, { message: 'service unavailable' });

    const err = await searchRepositories(query(), null).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.code).toBe('UPSTREAM_ERROR');
  });
});