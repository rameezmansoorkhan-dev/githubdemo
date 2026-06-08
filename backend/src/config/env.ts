import { z } from 'zod';

/**
 * Typed, validated environment loading. Fails fast at startup if the
 * environment is misconfigured rather than failing mysteriously later.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_URL: z.string().url().default('https://api.github.com'),
  CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(60_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid environment configuration:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;