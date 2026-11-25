function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined ? fallback : v;
}

/**
 * Centralised, typed access to environment configuration. Keeps env-var names in
 * one place so domains never read `process.env` ad-hoc (easier to validate and
 * to mock in tests).
 */
export const config = {
  port: () => Number(process.env.PORT ?? 3000),
  databaseUrl: () => str('DATABASE_URL'),
  clientOrigin: () => str('CLIENT_ORIGIN'),
  sessionCookieMaxAgeMs: () => Number(process.env.SESSION_COOKIE_MAX_AGE_MS ?? 1_209_600_000),
  adminEmailAllowlist: () => str('ADMIN_EMAIL_ALLOWLIST'),
  devAuthBypass: () => process.env.DEV_AUTH_BYPASS === 'true',
  isProd: () => process.env.NODE_ENV === 'production',
};
