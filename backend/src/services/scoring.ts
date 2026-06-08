import { SCORING } from '../config/scoring.js';
import type {
  GitHubRepoRaw,
  Repo,
  ScoreBreakdown,
} from '../types/index.js';

/**
 * Pure scoring functions — no I/O, no side effects. Easy to unit and
 * property test. See docs/adr/0001 for the formula rationale.
 *
 * score = W_stars   * log10(stars + 1)
 *       + W_forks   * log10(forks + 1)
 *       + W_recency * exp(-daysSincePush / halfLife)
 *
 * The raw sum is scaled into [0, scoreMax] using a fixed reference ceiling
 * so the output is stable and comparable across queries.
 */

/** A reference "very strong" repo, used to scale into [0, scoreMax]. */
const REFERENCE = {
  logStars: Math.log10(200_000 + 1), // ~5.3
  logForks: Math.log10(50_000 + 1), // ~4.7
  recency: 1, // freshly pushed
};

const MAX_RAW =
  SCORING.weights.stars * REFERENCE.logStars +
  SCORING.weights.forks * REFERENCE.logForks +
  SCORING.weights.recency * REFERENCE.recency;

export function daysSince(dateIso: string, now: Date = new Date()): number {
  const then = new Date(dateIso).getTime();
  const diffMs = now.getTime() - then;
  // Future dates clamp to 0 (treated as "just pushed").
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

export function recencyFactor(
  pushedAtIso: string,
  now: Date = new Date()
): number {
  const days = daysSince(pushedAtIso, now);
  return Math.exp(-days / SCORING.halfLifeDays);
}

export function computeBreakdown(
  stars: number,
  forks: number,
  pushedAtIso: string,
  now: Date = new Date()
): ScoreBreakdown {
  const s = Math.max(0, stars);
  const f = Math.max(0, forks);

  const rawStars = SCORING.weights.stars * Math.log10(s + 1);
  const rawForks = SCORING.weights.forks * Math.log10(f + 1);
  const rawRecency =
    SCORING.weights.recency * recencyFactor(pushedAtIso, now);

  const scale = SCORING.scoreMax / MAX_RAW;

  return {
    stars: round(rawStars * scale),
    forks: round(rawForks * scale),
    recency: round(rawRecency * scale),
  };
}

export function computeScore(
  stars: number,
  forks: number,
  pushedAtIso: string,
  now: Date = new Date()
): number {
  const b = computeBreakdown(stars, forks, pushedAtIso, now);
  const total = b.stars + b.forks + b.recency;
  // Clamp into [0, scoreMax] to guard against the reference ceiling.
  return round(Math.min(SCORING.scoreMax, Math.max(0, total)));
}

/** Map a raw GitHub repo to our scored Repo shape. */
export function toScoredRepo(
  raw: GitHubRepoRaw,
  now: Date = new Date()
): Repo {
  const breakdown = computeBreakdown(
    raw.stargazers_count,
    raw.forks_count,
    raw.pushed_at,
    now
  );
  const score = round(
    Math.min(
      SCORING.scoreMax,
      breakdown.stars + breakdown.forks + breakdown.recency
    )
  );

  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    url: raw.html_url,
    description: raw.description,
    language: raw.language,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    pushedAt: raw.pushed_at,
    score,
    scoreBreakdown: breakdown,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}