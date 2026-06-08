import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import type { ApiErrorBody } from '../types/index.js';

/**
 * Per-IP backend rate limiter. A DIFFERENT layer from GitHub's limit on us:
 * this protects OUR backend from bursty/abusive clients and indirectly
 * shields our GitHub quota. Emits the same 429 + envelope as GitHub
 * exhaustion, so clients handle both uniformly.
 *
 * Note: state is per-instance; swap in rate-limit-redis for multi-instance.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const body: ApiErrorBody = {
      error: {
        message: 'Too many requests. Please slow down and try again shortly.',
        code: 'RATE_LIMITED',
      },
    };
    res.status(429).json(body);
  },
});