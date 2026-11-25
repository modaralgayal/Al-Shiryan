import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** MIME types a doctor/pharmacist may store (lab PDFs, radiology images). */
export const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export function r2Enabled(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_ENDPOINT
  );
}

function mockMode(): boolean {
  return process.env.STORAGE_MODE === 'mock' || !r2Enabled();
}

function s3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export interface UploadValidation {
  ok: true;
  key: string;
  contentType: string;
}
export type UploadCheck = UploadValidation | { ok: false; error: 'unsupported_content_type' | 'file_too_large' };

/** Pure: validate MIME + size and derive a safe object key. No network. */
export function validateUpload(
  fileName: string,
  contentType: string,
  size: number,
): UploadCheck {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) return { ok: false, error: 'unsupported_content_type' };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: 'file_too_large' };
  const safe = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_') // collapse ".." runs — no path traversal in the key
    .slice(-120);
  const key = `uploads/${Date.now()}-${randomUUID()}-${safe}`;
  return { ok: true, key, contentType };
}

export async function presignPut(key: string, contentType: string): Promise<string> {
  if (mockMode()) return `https://mock.r2.local/${key}?op=put`;
  const url = await getSignedUrl(
    s3Client(),
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, ContentType: contentType }),
    { expiresIn: 600 },
  );
  return url;
}

export async function presignGet(key: string): Promise<string> {
  if (mockMode()) return `https://mock.r2.local/${key}?op=get`;
  const url = await getSignedUrl(s3Client(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }), {
    expiresIn: 600,
  });
  return url;
}
