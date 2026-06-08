import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Attach a correlation id to each request (reusing an inbound X-Request-Id
 * when provided) and echo it back so a search is traceable end-to-end.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('X-Request-Id');
  const id = incoming && incoming.length <= 200 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}