import { Request, Response, NextFunction } from 'express';
import type { ApiErrorBody } from '../types/index.js';

/** Typed application error carrying an HTTP status and a stable code. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Central error handler — logs with request id, returns the safe envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message = isApiError
    ? err.message
    : 'An unexpected error occurred.';

  // Structured log with correlation id; never leak stack traces to clients.
  req.log?.error(
    {
      err,
      status,
      code,
      requestId: req.id,
    },
    'request_failed'
  );

  const body: ApiErrorBody = {
    error: { message, code, ...(isApiError && err.details ? { details: err.details } : {}) },
  };

  res.status(status).json(body);
}

/** 404 fallthrough for unmatched routes. */
export function notFound(_req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: { message: 'Resource not found.', code: 'NOT_FOUND' },
  };
  res.status(404).json(body);
}