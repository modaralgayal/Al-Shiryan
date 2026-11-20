import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // Integration tests that need Postgres are skipped automatically when
    // DATABASE_URL is unset (see src/test/db.ts). Unit tests run anywhere.
    testTimeout: 20000,
  },
});
