/** Known audit-log action values. Kept as a union so call sites and tests stay consistent. */
export const AUDIT_ACTIONS = [
  'user_registered',
  'invite_created',
  'patient_create',
  'patient_view',
  'patient_update',
  'prescription_create',
  'prescription_cancel',
  'prescription_corrected',
  'prescription_dispensed',
  'file_upload_presigned',
  'file_download_presigned',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
