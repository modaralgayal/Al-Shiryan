import { db } from '../db/client';
import { auditLog } from '../db/schema';

/** Append-only audit trail. Used for pharmacist dispenses, admin actions, PHI access. */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  meta?: unknown,
): Promise<void> {
  await db.insert(auditLog).values({ actorId, action, entity, entityId, meta });
}
