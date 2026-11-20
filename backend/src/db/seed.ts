import 'dotenv/config';
import { createDb } from './client';
import { drugs } from './schema';

// Placeholder drugs — replace with the client's provided list (contract: "A drug
// list will be provided"). Idempotent: skips if the table already has rows.
const SAMPLES = [
  { name: 'Amoxicillin', form: 'capsule', strength: '500 mg' },
  { name: 'Paracetamol', form: 'tablet', strength: '500 mg' },
  { name: 'Lisinopril', form: 'tablet', strength: '10 mg' },
  { name: 'Metformin', form: 'tablet', strength: '500 mg' },
  { name: 'Atorvastatin', form: 'tablet', strength: '20 mg' },
];

async function main() {
  const { db, pool } = createDb();
  const existing = await db.select({ id: drugs.id }).from(drugs).limit(1);
  if (existing.length > 0) {
    console.log('drugs already seeded — skipping.');
    await pool.end();
    return;
  }
  await db.insert(drugs).values(SAMPLES);
  console.log(`seeded ${SAMPLES.length} drugs`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
