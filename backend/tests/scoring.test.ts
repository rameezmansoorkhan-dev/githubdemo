import { describe, it, expect } from 'vitest';
import {
  computeScore,
  computeBreakdown,
  daysSince,
  toScoredRepo,
} from '../src/services/scoring.js';
import type { GitHubRepoRaw } from '../src/types/index.js';

const NOW = new Date('2025-06-01T00:00:00Z');

describe('scoring (example-based)', () => {
  it('returns 0-ish for an empty, ancient repo', () => {
    const score = computeScore(0, 0, '2010-01-01T00:00:00Z', NOW);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(5);
  });

  it('scores a fresh, popular repo highly', () => {
    const score = computeScore(150_000, 40_000, NOW.toISOString(), NOW);
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('breakdown sums to the total', () => {
    const b = computeBreakdown(5000, 800, '2025-05-01T00:00:00Z', NOW);
    const total = b.stars + b.forks + b.recency;
    expect(computeScore(5000, 800, '2025-05-01T00:00:00Z', NOW)).toBeCloseTo(
      Math.round(total * 10) / 10,
      1
    );
  });

  it('clamps future pushed_at to 0 days', () => {
    expect(daysSince('2999-01-01T00:00:00Z', NOW)).toBe(0);
  });

  it('maps a raw repo into the scored shape', () => {
    const raw: GitHubRepoRaw = {
      id: 1,
      name: 'thing',
      full_name: 'me/thing',
      html_url: 'https://github.com/me/thing',
      description: null,
      language: 'TypeScript',
      stargazers_count: 1000,
      forks_count: 100,
      pushed_at: '2025-05-20T00:00:00Z',
    };
    const repo = toScoredRepo(raw, NOW);
    expect(repo.fullName).toBe('me/thing');
    expect(repo.scoreBreakdown.stars).toBeGreaterThan(0);
  });
});