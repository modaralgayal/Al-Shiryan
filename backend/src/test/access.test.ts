import { describe, it, expect } from 'vitest';
import { isAdminInviteAllowed, canViewPhi } from '../lib/access';

describe('isAdminInviteAllowed', () => {
  it('allows when no allowlist is configured', () => {
    expect(isAdminInviteAllowed('a@b.com', undefined)).toBe(true);
    expect(isAdminInviteAllowed('a@b.com', '')).toBe(true);
  });
  it('allows when the email is on the list', () => {
    expect(isAdminInviteAllowed('admin@x.com', 'admin@x.com, other@y.com')).toBe(true);
  });
  it('rejects when the email is not on the list', () => {
    expect(isAdminInviteAllowed('stranger@x.com', 'admin@x.com')).toBe(false);
  });
  it('rejects a missing email when a list is set', () => {
    expect(isAdminInviteAllowed(undefined, 'admin@x.com')).toBe(false);
  });
});

describe('canViewPhi', () => {
  it('doctor and admin can view PHI', () => {
    expect(canViewPhi('doctor')).toBe(true);
    expect(canViewPhi('admin')).toBe(true);
  });
  it('pharmacist cannot view PHI', () => {
    expect(canViewPhi('pharmacist')).toBe(false);
  });
});
