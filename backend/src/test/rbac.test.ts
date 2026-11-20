import { describe, it, expect } from 'vitest';
import { isAuthorized } from '../auth/rbac';

describe('isAuthorized (RBAC)', () => {
  it('allows a role that is in the allowed list', () => {
    expect(isAuthorized('doctor', ['doctor', 'admin'])).toBe(true);
    expect(isAuthorized('admin', ['admin'])).toBe(true);
  });

  it('denies a role that is not in the allowed list', () => {
    expect(isAuthorized('pharmacist', ['doctor', 'admin'])).toBe(false);
  });

  it('handles the pharmacist-only path', () => {
    expect(isAuthorized('pharmacist', ['pharmacist'])).toBe(true);
    expect(isAuthorized('doctor', ['pharmacist'])).toBe(false);
  });
});
