import { z } from 'zod';
import { roleSchema } from './enums';

/** Frontend sends the Firebase ID token; backend exchanges it for a session cookie. */
export const loginSchema = z.object({
  idToken: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  firebaseUid: z.string(),
  email: z.string().email(),
  role: roleSchema,
  fullName: z.string(),
  status: z.enum(['invited', 'active', 'disabled']),
  invitedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;
