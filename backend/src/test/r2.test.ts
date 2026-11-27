import { describe, it, expect } from 'vitest';
import { validateUpload, canDownloadKey, MAX_UPLOAD_BYTES } from '../domains/files/r2';

describe('canDownloadKey', () => {
  it('lets a user fetch their own upload only', () => {
    const r = validateUpload('a.pdf', 'application/pdf', 1, 'user-1');
    expect(r.ok && canDownloadKey(r.key, 'user-1', 'doctor')).toBe(true);
    expect(r.ok && canDownloadKey(r.key, 'user-2', 'doctor')).toBe(false);
  });
  it('lets admins fetch any upload but never library or traversal keys', () => {
    expect(canDownloadKey('uploads/user-1/x.pdf', 'adm', 'admin')).toBe(true);
    expect(canDownloadKey('library/book.pdf', 'adm', 'admin')).toBe(false);
    expect(canDownloadKey('uploads/../library/book.pdf', 'adm', 'admin')).toBe(false);
  });
});

describe('validateUpload', () => {
  it('accepts an allowed PDF and returns a safe key', () => {
    const r = validateUpload('lab-report.pdf', 'application/pdf', 1000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.key).toContain('uploads/');
  });

  it('rejects a disallowed MIME type', () => {
    const r = validateUpload('x.exe', 'application/octet-stream', 1000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('unsupported_content_type');
  });

  it('rejects an oversize file', () => {
    const r = validateUpload('big.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('file_too_large');
  });

  it('sanitizes the file name inside the key (no path traversal)', () => {
    const r = validateUpload('../../evil name!.pdf', 'application/pdf', 1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.key).not.toContain('..');
  });
});
