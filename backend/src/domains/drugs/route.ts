import { Router } from 'express';
import { and, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { drugs } from '../../db/schema';
import { authenticate } from '../../middleware/authenticate';
import { validateQuery } from '../../middleware/validate';
import { drugAutocompleteQuery } from '@aorta-iq/shared';

export const drugsRouter = Router();

/** Escape LIKE wildcards so user input is matched literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// Doctors pick only from this list — the server validates drug_id on prescription write.
// Matches brand name OR molecule; brand-prefix matches sort first.
drugsRouter.get(
  '/',
  authenticate,
  validateQuery(drugAutocompleteQuery),
  async (req, res, next) => {
    try {
      const q = String((req.query as { q: string }).q).trim();
      const like = `%${escapeLike(q)}%`;
      const rows = await db
        .select()
        .from(drugs)
        .where(and(isNull(drugs.deletedAt), or(ilike(drugs.name, like), ilike(drugs.molecule, like))))
        .orderBy(
          sql`(lower(${drugs.name}) like ${escapeLike(q.toLowerCase()) + '%'}) desc`,
          drugs.name,
          drugs.pack,
        )
        .limit(20);
      res.json({ drugs: rows });
    } catch (e) {
      next(e);
    }
  },
);
