import type { Role, User } from '@aorta-iq/shared';

/** Client-side convenience; the server is the real authority (see backend RBAC). */
export function can(role: Role | undefined, ...allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}

export type { User };
