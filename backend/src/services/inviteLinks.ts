import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { inviteLinks } from '../db/schema';
import type { Role } from '@aorta-iq/shared';

export function makeInviteToken(): string {
  return randomBytes(32).toString('hex');
}

/** Tokens are stored only as a SHA-256 hash; the raw token is shown once. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createInvite(opts: {
  role: Role;
  createdBy: string;
  email?: string;
  ttlHours?: number;
}): Promise<string> {
  const token = makeInviteToken();
  const expiresAt = new Date(Date.now() + (opts.ttlHours ?? 72) * 3600 * 1000);
  await db.insert(inviteLinks).values({
    tokenHash: hashToken(token),
    role: opts.role,
    email: opts.email ?? null,
    createdBy: opts.createdBy,
    expiresAt,
  });
  return token;
}

export type RedeemedInvite = { role: Role; email: string | null };

/** Read-only peek at an invite's role/email — does NOT redeem it. Used by the
 * register page to decide which professional-ID field to show. */
export async function peekInvite(token: string): Promise<RedeemedInvite | null> {
  const hash = hashToken(token);
  const rows = await db
    .select()
    .from(inviteLinks)
    .where(eq(inviteLinks.tokenHash, hash))
    .limit(1);
  const inv = rows[0];
  if (!inv || inv.usedAt || inv.expiresAt.getTime() < Date.now()) return null;
  return { role: inv.role, email: inv.email };
}

/** Single-use + expiring. Marks the invite used and returns its role. */
export async function redeemInvite(token: string): Promise<RedeemedInvite> {
  const hash = hashToken(token);
  const rows = await db
    .select()
    .from(inviteLinks)
    .where(eq(inviteLinks.tokenHash, hash))
    .limit(1);
  const inv = rows[0];
  if (!inv) throw new Error('invalid_invite');
  if (inv.usedAt) throw new Error('invite_already_used');
  if (inv.expiresAt.getTime() < Date.now()) throw new Error('invite_expired');
  await db
    .update(inviteLinks)
    .set({ usedAt: new Date() })
    .where(eq(inviteLinks.tokenHash, hash));
  return { role: inv.role, email: inv.email };
}
