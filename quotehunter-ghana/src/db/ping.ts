import pg from 'pg';
import { getPoolConfig, getConnectionUrl } from './connection.ts';

/**
 * Pre-flight database check used before migrations.
 * drizzle-kit hides connection errors, so this prints the real reason (never the password).
 */
async function main() {
  const url = getConnectionUrl(true);
  if (!url && !process.env.SQL_HOST) {
    console.error('[DB check] No DATABASE_URL is set. Add it in the Render Environment tab.');
    process.exit(1);
  }

  if (url) {
    try {
      const u = new URL(url);
      console.log(`[DB check] host=${u.hostname} db=${u.pathname.replace('/', '')} user=${decodeURIComponent(u.username)} pooled=${u.hostname.includes('-pooler')}`);
    } catch {
      console.error('[DB check] DATABASE_URL is not a valid URL. Paste only the postgresql://... part, with no quotes or "psql" prefix.');
      process.exit(1);
    }
  }

  const client = new pg.Client({ ...getPoolConfig(true), connectionTimeoutMillis: 45000 });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database() AS db, current_user AS usr');
    console.log(`[DB check] Connected OK as ${r.rows[0].usr} to ${r.rows[0].db}`);
    await client.end();
  } catch (err: any) {
    console.error(`[DB check] CONNECTION FAILED: ${err?.message || err} (code: ${err?.code || 'n/a'})`);
    process.exit(1);
  }
}

main();
