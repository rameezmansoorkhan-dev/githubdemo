import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { mountDocs } from './docs/openapi.js';
import reposRouter from './routes/repos.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors({ origin: env.CORS_ORIGIN }));

  // Correlation id first, then structured request logging bound to it.
  app.use(requestId);
  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
      genReqId: (req) => (req as { id?: string }).id ?? randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    })
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  mountDocs(app);

  // Guard 1: throttle all API traffic per IP.
  app.use('/api', apiRateLimiter);
  // Guard 2 (per-route): query validation lives inside the router.
  app.use('/api', reposRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// Only listen when run directly (tests import createApp instead).
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${env.PORT}`);
    console.log(`API docs at http://localhost:${env.PORT}/docs`);
  });
}

export default createApp;