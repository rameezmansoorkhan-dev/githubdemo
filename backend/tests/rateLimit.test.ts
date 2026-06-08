import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Force a tiny limit for this test before importing the app.
vi.stubEnv('RATE_LIMIT_MAX', '2');
vi.stubEnv('RATE_LIMIT_WINDOW_MS', '60000');

const { createApp } = await import('../src/server.js');
const github = await import('../src/services/github.js');

describe('rate limiter guard', () => {
  it('returns 429 + envelope once the window max is exceeded', async () => {
    vi.spyOn(github, 'searchRepositories').mockResolvedValue({
      items: [],
      total: 0,
      etag: null,
      rateLimitRemaining: 10,
      notModified: false,
    });

    const app = createApp();
    await request(app).get('/api/repositories').query({ language: 'a' });
    await request(app).get('/api/repositories').query({ language: 'b' });
    const blocked = await request(app)
      .get('/api/repositories')
      .query({ language: 'c' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});