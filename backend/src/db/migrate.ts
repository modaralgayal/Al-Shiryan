import 'dotenv/config';
import { runMigrations } from './migrator-guard';

const CONFIRM_PHRASE = 'I-UNDERSTAND-THIS-IS-DESTRUCTIVE';

async function main() {
  const danger = process.argv.includes('--danger');

  if (danger) {
    // Gate 1: explicit env opt-in.
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== '1') {
      console.error('[GUARD] Set ALLOW_DESTRUCTIVE_MIGRATIONS=1 to run a destructive migration.');
      process.exit(1);
    }
    // Gate 2: production requires a matching token; nothing bypasses this.
    if (process.env.NODE_ENV === 'production') {
      if (process.env.PROD_DESTRUCTIVE_TOKEN !== process.env.EXPECTED_PROD_TOKEN) {
        console.error('[GUARD] Refusing destructive migration on production without a matching PROD_DESTRUCTIVE_TOKEN.');
        process.exit(1);
      }
    }
    // Gate 3: must type the confirmation phrase (interactive or via env).
    if (process.env.CONFIRM_MIGRATION_NAME !== CONFIRM_PHRASE) {
      console.error(`[GUARD] Type the confirmation phrase to proceed: ${CONFIRM_PHRASE}`);
      process.exit(1);
    }
    console.warn('[GUARD] DANGER MODE — destructive statements WILL be applied.');
  }

  const applied = await runMigrations({ danger });
  console.log(`Migrations complete. (${applied.length} applied)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
