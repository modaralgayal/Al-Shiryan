import { describe, it, expect } from 'vitest';
import { LIBRARY_BOOKS, findBook, libraryKey } from '@aorta-iq/shared';
import { canDownloadKey } from '../domains/files/r2';

describe('library catalogue', () => {
  it('has 18 unique books mapped to library/ keys', () => {
    expect(LIBRARY_BOOKS).toHaveLength(18);
    expect(new Set(LIBRARY_BOOKS.map((b) => b.id)).size).toBe(18);
    expect(libraryKey(LIBRARY_BOOKS[0]!.id)).toMatch(/^library\/.+\.pdf$/);
  });
  it('rejects unknown ids (no raw keys accepted)', () => {
    expect(findBook('../../uploads/x')).toBeUndefined();
  });
  it('books are not reachable through the generic file download', () => {
    expect(canDownloadKey(libraryKey(LIBRARY_BOOKS[0]!.id), 'any', 'admin')).toBe(false);
  });
});
