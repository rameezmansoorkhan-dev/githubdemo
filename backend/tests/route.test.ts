import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import * as github from '../src/services/github.js';
import { reposCache } from '../src/routes/repos.js';

const sampleFetch = {
  items: [
    {
      id: 1,
      name: 'a',
      full_name: 'x/a',
      html_url: 'https://github.com/x/a',
      description: null,
      language: 'TypeScript',
      stargazers_count: 1000,
      forks_count: 100,
      pushed_at: '2025-05-20T00:00:00Z',
    },
  ],
  total: 1,
  etag: 'W/"abc"',
  rateLimitRemaining: 29,
  notModified: false,
};

describe('GET /api/repositories', () => {
  beforeEach(() => {
    reposCache.clear();
    vi.restoreAllMocks();
  });

  it('returns ranked items on success', async () => {
    vi.spyOn(github, 'searchRepositories').mockResolvedValue(sampleFetch);
    const app = createApp();
    const res = await request(app)
      .get('/api/repositories')
      .query({ language: 'typescript' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].scoreBreakdown).toBeDefined();
    expect(res.body.rateLimitRemaining).toBe(29);
  });

  it('rejects invalid params with 400 + envelope', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/repositories')
      .query({ createdAfter: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('rejects over-pagination beyond GitHub 1000 cap', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/repositories')
      .query({ page: 11, perPage: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps upstream failure to its status + envelope', async () => {
    const { ApiError } = await import('../src/middleware/error.js');
    vi.spyOn(github, 'searchRepositories').mockRejectedValue(
      new ApiError(502, 'Failed to reach the GitHub API.', 'UPSTREAM_ERROR')
    );
    const app = createApp();
    const res = await request(app).get('/api/repositories');

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('serves the second identical request from cache (one upstream call)', async () => {
    const spy = vi
      .spyOn(github, 'searchRepositories')
      .mockResolvedValue(sampleFetch);
    const app = createApp();

    await request(app).get('/api/repositories').query({ language: 'go' });
    await request(app).get('/api/repositories').query({ language: 'go' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports sortBy ordering', async () => {
    vi.spyOn(github, 'searchRepositories').mockResolvedValue({
      ...sampleFetch,
      items: [
        { ...sampleFetch.items[0], id: 1, stargazers_count: 10, forks_count: 999 },
        { ...sampleFetch.items[0], id: 2, stargazers_count: 9999, forks_count: 1 },
      ],
      total: 2,
    });
    const app = createApp();
    const res = await request(app)
      .get('/api/repositories')
      .query({ sortBy: 'forks' });

    expect(res.body.items[0].forks).toBeGreaterThanOrEqual(
      res.body.items[1].forks
    );
  });
});