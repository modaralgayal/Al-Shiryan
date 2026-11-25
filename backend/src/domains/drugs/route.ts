import { Router } from 'express';
import { ilike } from 'drizzle-orm';
import { db } from '../../db/client';
import { drugs } from '../../db/schema';
import { authenticate } from '../../middleware/authenticate';
import { validateQuery } from '../../middleware/validate';
import { drugAutocompleteQuery } from '@aorta-iq/shared';

export const drugsRouter = Router();

// Doctors pick only from this list — the server validates drug_id on prescription write.
drugsRouter.get(
  '/',
  authenticate,
  validateQuery(drugAutocompleteQuery),
  async (req, res, next) => {
    try {
      const { q } = req.query as { q: string };
      const rows = await db
        .select()
        .from(drugs)
        .where(ilike(drugs.name, `%${q}%`))
        .limit(20);
      res.json({ drugs: rows });
    } catch (e) {
      next(e);
    }
  },
);
