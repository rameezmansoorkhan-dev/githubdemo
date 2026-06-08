import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import type { ApiErrorBody } from '../types/index.js';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Guard factory: validate a request part against a Zod schema. On success,
 * replace the raw input with the parsed/coerced value (typed + normalized).
 * On failure, return 400 with the standard envelope and field-level details.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'query') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const body: ApiErrorBody = {
        error: {
          message: 'Invalid request parameters.',
          code: 'VALIDATION_ERROR',
          details: formatZodError(result.error),
        },
      };
      res.status(400).json(body);
      return;
    }

    // Express 5 makes req.query a getter; assign via defineProperty-safe path.
    (req as Record<RequestPart, unknown>)[part] = result.data;
    next();
  };
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}