import { describe, it, expect } from 'vitest';
import { makeInviteToken, hashToken } from '../services/inviteLinks';

describe('invite tokens', () => {
  it('produces a 64-char hex token (32 random bytes)', () => {
    const t = makeInviteToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashes deterministically and is not the raw token', () => {
    const t = makeInviteToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces unique tokens', () => {
    expect(makeInviteToken()).not.toBe(makeInviteToken());
  });
});
