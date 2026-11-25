import type { Role } from '@aorta-iq/shared';

/** PHI (full patient record / confidential doctor fields) is doctor+admin only. */
export function canViewPhi(role: Role): boolean {
  return role === 'doctor' || role === 'admin';
}

/**
 * Admin invites are gated by an email allowlist (contract: "email allowlist for
 * the Admin"). If ADMIN_EMAIL_ALLOWLIST is empty/unset, admin invites are
 * allowed (dev convenience). Otherwise the invite email must be on the list.
 */
export function isAdminInviteAllowed(email: string | undefined, allowlist: string | undefined): boolean {
  if (!allowlist) return true;
  const set = allowlist
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (set.length === 0) return true;
  if (!email) return false;
  return set.includes(email.trim().toLowerCase());
}

/** Fields stripped from a patient record when returned to a non-PHI viewer. */
export const PATIENT_PUBLIC_FIELDS = [
  'id',
  'patientId',
  'name',
  'age',
  'gender',
  'dateOfBirth',
  'weightKg',
] as const;
