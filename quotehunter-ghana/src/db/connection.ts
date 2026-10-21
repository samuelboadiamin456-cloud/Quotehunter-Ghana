import type { PoolConfig } from 'pg';

/**
 * Shared Postgres connection settings.
 *
 * Preferred (Neon / Render / any hosted Postgres):
 *   DATABASE_URL        -> used by the running app (Neon "pooled" URL is fine)
 *   DATABASE_ADMIN_URL  -> optional, used for migrations (Neon "direct" URL). Falls back to DATABASE_URL.
 *   DATABASE_SSL=false  -> only for a local non-SSL Postgres
 *
 * Legacy (AI Studio / Cloud SQL): SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME (+ SQL_ADMIN_USER / SQL_ADMIN_PASSWORD).
 */
const sslEnabled = process.env.DATABASE_SSL !== 'false';

export function getConnectionUrl(admin = false): string | undefined {
  return (admin && process.env.DATABASE_ADMIN_URL) || process.env.DATABASE_URL || undefined;
}

export function getPoolConfig(admin = false): PoolConfig {
  const url = getConnectionUrl(admin);
  if (url) {
    return {
      connectionString: url,
      ssl: sslEnabled ? { rejectUnauthorized: true } : false,
      max: admin ? 2 : 5,
      connectionTimeoutMillis: 30000, // allows a Neon free-tier database to wake from idle
      idleTimeoutMillis: 30000,
    };
  }

  return {
    host: process.env.SQL_HOST,
    user: admin ? (process.env.SQL_ADMIN_USER || process.env.SQL_USER) : process.env.SQL_USER,
    password: admin ? (process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD) : process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: admin ? 2 : 10,
    connectionTimeoutMillis: 15000,
  };
}

/** Database role the app connects as (used to grant sequence permissions). */
export function getAppDbUser(): string | undefined {
  if (process.env.SQL_APP_USER) return process.env.SQL_APP_USER;
  if (process.env.DATABASE_URL) {
    try {
      return decodeURIComponent(new URL(process.env.DATABASE_URL).username) || undefined;
    } catch {
      return undefined;
    }
  }
  return process.env.SQL_USER;
}
