import { z } from 'zod';

/** Seeded from the client's provided drug list. Doctors may ONLY pick from this. */
export const drugSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  form: z.string().min(1),
  strength: z.string(), // may be empty when the pack states none
  pack: z.string().nullable().optional(),
  molecule: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Drug = z.infer<typeof drugSchema>;

/** Autocomplete query — never free text into a prescription. An empty `q` returns
 *  the full seeded list (used by list views to resolve drug names). */
export const drugAutocompleteQuery = z.object({
  q: z.string().max(100),
});
