import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/** Validate + coerce a request body with Zod, replacing req.body with the parsed value. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'validation_failed', issues: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validate query params with Zod. */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: 'validation_failed', issues: result.error.flatten() });
      return;
    }
    req.query = result.data as Record<string, unknown> as typeof req.query;
    next();
  };
}
