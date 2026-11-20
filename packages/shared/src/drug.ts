import { z } from 'zod';

/** Seeded from the client's provided drug list. Doctors may ONLY pick from this. */
export const drugSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  form: z.string().min(1),
  strength: z.string().min(1),
  createdAt: z.string(),
});
export type Drug = z.infer<typeof drugSchema>;

/** Autocomplete query — never free text into a prescription. */
export const drugAutocompleteQuery = z.object({
  q: z.string().min(1).max(100),
});
