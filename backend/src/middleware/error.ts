import type { ErrorRequestHandler } from 'express';

/** Final error handler. Never leak stack traces or PHI to the client. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error' });
};
