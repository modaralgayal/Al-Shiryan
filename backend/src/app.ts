import express from 'express';
import { securityMiddlewares } from './middleware/security';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { drugsRouter } from './routes/drugs';
import { adminRouter } from './routes/admin';

/** Builds the Express app (factored out so it can be imported by tests). */
export function createApp() {
  const app = express();
  app.use(express.json());
  securityMiddlewares().forEach((m) => app.use(m));

  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRouter);
  app.use('/api/drugs', drugsRouter);
  app.use('/api/admin', adminRouter);

  app.use(errorHandler);
  return app;
}
