import type { ErrorRequestHandler } from 'express';

/**
 * Typed application error. Carries a stable machine-readable `code` (returned to
 * the client as `{ error: code }`) and the HTTP `statusCode`. New domain code
 * should throw `AppError` (or use the `badRequest`/`conflict`/... helpers)
 * instead of hand-writing `res.status(...).json(...)` so the API contract stays
 * consistent and no stack traces ever reach the client.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 500,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, details?: unknown): never => {
  throw new AppError(code, 400, details);
};
export const unauthorized = (code = 'unauthorized', details?: unknown): never => {
  throw new AppError(code, 401, details);
};
export const forbidden = (code = 'forbidden', details?: unknown): never => {
  throw new AppError(code, 403, details);
};
export const notFound = (code = 'not_found', details?: unknown): never => {
  throw new AppError(code, 404, details);
};
export const conflict = (code: string, details?: unknown): never => {
  throw new AppError(code, 409, details);
};

/** Single error handler used by `createApp`. Never leaks stacks/PHI. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code });
  }
  console.error('[error]', err);
  const status = (err as { statusCode?: number })?.statusCode ?? 500;
  res.status(status).json({ error: 'internal_error' });
};
