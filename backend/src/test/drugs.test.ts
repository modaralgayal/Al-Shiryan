import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeLike } from '../domains/drugs/route';

const rows = JSON.parse(readFileSync(join(__dirname, '../db/data/drugs.json'), 'utf8')) as {
  name: string; form: string; strength: string; pack: string; molecule: string;
}[];

describe('drug catalogue data', () => {
  it('is the client list: thousands of rows, no blanks, no duplicates', () => {
    expect(rows.length).toBeGreaterThan(17000);
    expect(rows.every((r) => r.name && r.form && r.pack && r.molecule)).toBe(true);
    expect(new Set(rows.map((r) => `${r.name}|${r.pack}|${r.molecule}`)).size).toBe(rows.length);
  });
  it('no longer contains the old placeholder drugs', () => {
    expect(rows.some((r) => r.name === 'Lisinopril' || r.name === 'Metformin')).toBe(false);
  });
});

describe('escapeLike', () => {
  it('matches user input literally (no wildcard injection)', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
