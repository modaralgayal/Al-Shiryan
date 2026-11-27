import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../auth/rbac';
import { findBook, libraryKey, LIBRARY_READER_ROLES } from '@aorta-iq/shared';
import { presignGet } from '../files/r2';
import { audit } from '../../services/auditLog';

export const libraryRouter = Router();
libraryRouter.use(authenticate, requireRole(...LIBRARY_READER_ROLES));

/**
 * Returns a short-lived (5 min) link to a book's PDF. The client sends only a
 * catalogue id — never a storage key — so this route can't be used to read other files.
 */
libraryRouter.get('/:id/read', async (req, res, next) => {
  try {
    const book = findBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'book_not_found' });
    const url = await presignGet(libraryKey(book.id), { inlinePdf: true, expiresIn: 300 });
    await audit(req.user!.id, 'library_book_opened', 'library', book.id);
    res.json({ url });
  } catch (e) {
    next(e);
  }
});
