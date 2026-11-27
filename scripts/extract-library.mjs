#!/usr/bin/env node
// Usage: node scripts/extract-library.mjs <folder-with-pdfs>
// Needs poppler-utils (pdfinfo, pdftotext, pdftoppm):  sudo apt install poppler-utils
// For each PDF it writes:
//   frontend/public/library/covers/<slug>.webp-ready .jpg  (page 1 rendered)
//   scripts/library-titles.json  -> [{ file, slug, title, source }] for you to REVIEW
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('pass the PDF folder');
const coverDir = 'frontend/public/library/covers';
mkdirSync(coverDir, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' });
const slugify = (s) => s.toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const out = [];
for (const file of readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort()) {
  const path = join(dir, file);
  const slug = slugify(file);
  let title = '';
  let source = '';

  // 1) PDF metadata Title (ignore junk like "Microsoft Word - x.docx")
  const meta = /^Title:\s*(.+)$/m.exec(run('pdfinfo', [path]))?.[1]?.trim() ?? '';
  if (meta && !/\.(docx?|indd|pdf)$|^microsoft|^untitled/i.test(meta)) {
    title = meta; source = 'metadata';
  } else {
    // 2) First non-trivial lines of page 1 text (cover page)
    const lines = run('pdftotext', ['-f', '1', '-l', '1', '-layout', path, '-'])
      .split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
    if (lines.length) { title = lines.slice(0, 2).join(' '); source = 'page1-text'; }
  }
  if (!title) { title = basename(file, '.pdf').replace(/[_-]+/g, ' '); source = 'filename'; }

  // Cover = page 1 as JPEG, 600px wide
  run('pdftoppm', ['-f', '1', '-l', '1', '-jpeg', '-scale-to-x', '600', '-scale-to-y', '-1', '-singlefile', path, join(coverDir, slug)]);
  out.push({ file, slug, title, source });
}
writeFileSync('scripts/library-titles.json', JSON.stringify(out, null, 2));
console.table(out);
console.log('\nReview scripts/library-titles.json — fix any title with source != metadata.');
