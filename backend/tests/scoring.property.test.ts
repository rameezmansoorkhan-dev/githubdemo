import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeScore, computeBreakdown } from '../src/services/scoring.js';

const NOW = new Date('2025-06-01T00:00:00Z');

const stars = fc.integer({ min: 0, max: 5_000_000 });
const forks = fc.integer({ min: 0, max: 2_000_000 });
const pushedAt = fc
  .date({ min: new Date('2008-01-01'), max: NOW })
  .map((d) => d.toISOString());

describe('scoring (property-based)', () => {
  it('score is always within [0, 100]', () => {
    fc.assert(
      fc.property(stars, forks, pushedAt, (s, f, p) => {
        const score = computeScore(s, f, p, NOW);
        return score >= 0 && score <= 100;
      })
    );
  });

  it('is monotonic in stars (others fixed)', () => {
    fc.assert(
      fc.property(stars, stars, forks, pushedAt, (a, b, f, p) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return computeScore(hi, f, p, NOW) >= computeScore(lo, f, p, NOW);
      })
    );
  });

  it('is monotonic in recency: newer pushed_at never lowers score', () => {
    fc.assert(
      fc.property(stars, forks, pushedAt, pushedAt, (s, f, p1, p2) => {
        const older = p1 < p2 ? p1 : p2;
        const newer = p1 < p2 ? p2 : p1;
        return computeScore(s, f, newer, NOW) >= computeScore(s, f, older, NOW);
      })
    );
  });

  it('breakdown components sum (within epsilon) to the total', () => {
    fc.assert(
      fc.property(stars, forks, pushedAt, (s, f, p) => {
        const b = computeBreakdown(s, f, p, NOW);
        const sum = b.stars + b.forks + b.recency;
        const total = computeScore(s, f, p, NOW);
        // total may be clamped at 100; otherwise within rounding epsilon.
        return total >= 100 - 0.05 || Math.abs(sum - total) < 0.35;
      })
    );
  });

  it('never produces NaN or Infinity', () => {
    fc.assert(
      fc.property(stars, forks, pushedAt, (s, f, p) => {
        const score = computeScore(s, f, p, NOW);
        return Number.isFinite(score);
      })
    );
  });
});