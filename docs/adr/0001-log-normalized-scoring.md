# 1. Log-normalized scoring with exponential recency decay

Date: 2025-06-01

## Status
Accepted

## Context
We need a single popularity number per repository so results can be ranked.
The raw signals available from the GitHub Search API are stars, forks, and
`pushed_at`. Star and fork counts are extremely right-skewed: a handful of
mega-repos have hundreds of thousands of stars while the long tail has a few
dozen. Using raw counts would let a few outliers dominate every ranking and
would make differences in the long tail invisible. We also want recently
active projects to rank above abandoned ones with similar historical counts.

## Decision
Compute the score as:

    score = W_stars   * log10(stars + 1)
          + W_forks   * log10(forks + 1)
          + W_recency * exp(-daysSincePush / HALF_LIFE)

- Log10 normalization compresses the skew so growth is rewarded with
  diminishing returns rather than linearly.
- Exponential decay on `pushed_at` gives a repo half its recency contribution
  every HALF_LIFE days of inactivity.
- We use `pushed_at` (real code activity) rather than `updated_at` (which also
  changes on metadata edits).
- Defaults: W_stars=0.5, W_forks=0.3, W_recency=0.2, HALF_LIFE=30 days.
- The raw sum is scaled into [0, 100] against a fixed reference ceiling so
  output is stable and comparable across queries.
- All constants live in `config/scoring.ts` so tuning needs no logic change.
- The function also returns a per-component breakdown for explainability.

## Consequences
- Positive: rankings are robust to outliers, reward active projects, and are
  transparent via the breakdown. The formula is pure and easy to unit and
  property test (monotonicity, bounded output, breakdown sums to total).
- Negative: weights and half-life are judgment calls, not learned from data.
  The fixed reference ceiling means the absolute 0–100 scale is somewhat
  arbitrary, though relative ordering is unaffected.
- The scaling reference may need revisiting if the formula or weights change
  substantially.