import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { validateBody } from '../../middleware/validate';
import { validateUpload, presignPut, presignGet, canDownloadKey } from './r2';
import { audit } from '../../services/auditLog';

const presignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export const filesRouter = Router();
filesRouter.use(authenticate, requireRole('doctor', 'admin'));

filesRouter.post('/presign-upload', validateBody(presignSchema), async (req, res, next) => {
  try {
    const check = validateUpload(
      req.body.fileName,
      req.body.contentType,
      req.body.size,
      req.user!.id,
    );
    if (!check.ok) return res.status(400).json({ error: check.error });
    const putUrl = await presignPut(check.key, check.contentType);
    await audit(req.user!.id, 'file_upload_presigned', 'files', undefined, { key: check.key });
    res.json({ key: check.key, putUrl });
  } catch (e) {
    next(e);
  }
});

filesRouter.get('/presign-download', async (req, res, next) => {
  try {
    const key = String(req.query.key ?? '');
    if (!key) return res.status(400).json({ error: 'missing_key' });
    if (!canDownloadKey(key, req.user!.id, req.user!.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const getUrl = await presignGet(key);
    await audit(req.user!.id, 'file_download_presigned', 'files', undefined, { key });
    res.json({ getUrl });
  } catch (e) {
    next(e);
  }
});
