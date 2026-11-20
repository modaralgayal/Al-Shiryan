import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/** Helmet (secure headers/HSTS), CORS locked to the frontend origin, brute-force limiter. */
export function securityMiddlewares() {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const origins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsMiddleware = cors({ origin: origins, credentials: true });
  return [helmet(), corsMiddleware, limiter];
}
