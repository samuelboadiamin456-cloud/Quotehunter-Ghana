import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getPoolConfig } from './connection.ts';

/**
 * Applies the SQL files in ./drizzle to the database (same journal drizzle-kit uses).
 * Unlike `drizzle-kit migrate`, this prints the real error when something fails.
 */
async function main() {
  const pool = new pg.Pool({ ...getPoolConfig(true), connectionTimeoutMillis: 45000 });
  try {
    const existing = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const names = existing.rows.map((r: any) => r.table_name);
    console.log(`[Schema] Tables already in public schema: ${names.length ? names.join(', ') : '(none)'}`);

    const applied = await pool
      .query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations')
      .then((r) => r.rows[0].n)
      .catch(() => 0);
    if (names.length > 0 && applied === 0) {
      console.warn('[Schema] WARNING: this database already has tables but no migration history. If they belong to another app, use a fresh database for QuoteHunter.');
    }

    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('[Schema] Migrations applied successfully.');
  } catch (err: any) {
    const root = err?.cause || err; // drizzle wraps the real database error in `cause`
    console.error(`[Schema] MIGRATION FAILED: ${root?.message || err?.message || err}`);
    if (root?.detail) console.error(`[Schema] detail: ${root.detail}`);
    if (root?.code) console.error(`[Schema] code: ${root.code}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
