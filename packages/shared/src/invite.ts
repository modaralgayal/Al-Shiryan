import { z } from 'zod';
import { roleSchema } from './enums';

export const inviteCreateSchema = z.object({
  role: roleSchema,
  email: z.string().email().optional(),
});
export type InviteCreate = z.infer<typeof inviteCreateSchema>;

/** Redeemed via a single-use, expiring, signed link. */
export const inviteSchema = z.object({
  token: z.string().min(1),
  role: roleSchema,
  expiresAt: z.string(),
  used: z.boolean(),
  email: z.string().nullable(),
});
export type Invite = z.infer<typeof inviteSchema>;

export const inviteRedeemSchema = z.object({
  token: z.string().min(1),
});
