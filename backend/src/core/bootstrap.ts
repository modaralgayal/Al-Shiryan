import express from 'express';
import cookieParser from 'cookie-parser';
import { securityMiddlewares } from '../middleware/security';
import { errorHandler } from './errors';
import { authRouter } from '../domains/auth';
import { drugsRouter } from '../domains/drugs';
import { adminRouter } from '../domains/accounts';
import { patientsRouter } from '../domains/patients';
import { prescriptionsRouter } from '../domains/prescriptions';
import { pharmacistRouter } from '../domains/pharmacist';
import { filesRouter } from '../domains/files';

/**
 * Composes the Express app. Each domain owns its router (exported from its
 * `index.ts`); this layer only wires global middleware + mounts them. Factored
 * out so tests can `import { createApp }` without booting the server.
 */
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  securityMiddlewares().forEach((m) => app.use(m));

  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRouter);
  app.use('/api/drugs', drugsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/prescriptions', prescriptionsRouter);
  app.use('/api/pharmacist', pharmacistRouter);
  app.use('/api/files', filesRouter);

  app.use(errorHandler);
  return app;
}
