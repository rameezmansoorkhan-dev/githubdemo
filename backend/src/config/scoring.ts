/**
 * Scoring constants — tunable without touching business logic.
 * See docs/adr/0001-log-normalized-scoring.md for rationale.
 */
export const SCORING = {
  weights: {
    stars: 0.5,
    forks: 0.3,
    recency: 0.2,
  },
  /** Days after which the recency contribution halves. */
  halfLifeDays: 30,
  /** Final score is scaled to this range for the UI. */
  scoreMax: 100,
} as const;

export type ScoringConfig = typeof SCORING;