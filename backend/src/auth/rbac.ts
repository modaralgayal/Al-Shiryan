import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@aorta-iq/shared';

/** Pure, unit-testable role check. */
export function isAuthorized(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

/** Route guard: only the listed roles may pass. Runs after `authenticate`. */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (!isAuthorized(req.user.role, allowed)) {
      return res.status(403).json({ error: 'forbidden', required: allowed });
    }
    next();
  };
}
