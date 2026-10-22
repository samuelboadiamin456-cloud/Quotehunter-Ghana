import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';
import { getPoolConfig, getAppDbUser } from './connection.ts';
import { materialRequests, quotations, orders, users } from './schema.ts';

const { Pool } = pg;

export function getAdminDb() {
  const adminPool = new Pool(getPoolConfig(true));
  return { pool: adminPool, db: drizzle(adminPool, { schema }) };
}

/**
 * Additive Database Migration & Sequence Alignment Runner.
 * 
 * 1. Creates PostgreSQL sequences for RFQs, Quotes, and Orders if they do not exist.
 * 2. Inspects all existing records in material_requests, quotations, and orders.
 * 3. Safely initializes sequence values ahead of any existing historical numbers,
 *    guaranteeing zero collisions under concurrent operations.
 * 4. Ensures permissions are granted to the application database user.
 * 5. Safely bootstraps the authoritative super_admin in the database.
 */
export async function runMigrations(): Promise<{ success: boolean; sequencesAligned: Record<string, number> }> {
  console.log('[Migration] Starting sequence creation and alignment...');
  const { pool, db } = getAdminDb();

  try {
    // 1. Create sequences idempotently
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS rfq_number_seq;`);
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS quote_number_seq;`);
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq;`);

    // 1b. Billing tables + invoice number sequence (idempotent)
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
        plan text NOT NULL,
        current_period_end timestamp NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
        id text PRIMARY KEY,
        organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id text,
        plan text NOT NULL,
        provider text NOT NULL DEFAULT 'paystack',
        reference text NOT NULL UNIQUE,
        amount_pesewas integer NOT NULL,
        currency text NOT NULL DEFAULT 'GHS',
        status text NOT NULL DEFAULT 'pending',
        period_days integer NOT NULL,
        invoice_number text,
        note text,
        created_at timestamp NOT NULL DEFAULT now(),
        paid_at timestamp
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_org_idx ON payments (organization_id, created_at DESC);`);

    // 2. Adjust column nullability on organizations so new onboarding users do not require fake phone/address
    // Only alter columns that are still NOT NULL, so routine restarts never request a table lock.
    const notNull = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'organizations'
        AND column_name IN ('phone','address','city','region') AND is_nullable = 'NO';
    `);
    for (const row of notNull.rows as Array<{ column_name: string }>) {
      await db.execute(sql.raw(`ALTER TABLE organizations ALTER COLUMN "${row.column_name}" DROP NOT NULL;`));
    }

    // 3. Grant sequence permissions strictly to the application database user (never to public)
    // Only the three procurement-number sequences, only to the app user, with a safely quoted identifier.
    const appDbUser = getAppDbUser();
    if (appDbUser) {
      const quotedAppUser = '"' + appDbUser.replace(/"/g, '""') + '"';
      try {
        await db.execute(sql`
          GRANT USAGE, SELECT, UPDATE ON SEQUENCE rfq_number_seq, quote_number_seq, order_number_seq TO ${sql.raw(quotedAppUser)};
        `);
      } catch (grantErr: any) {
        // Not fatal: when the app and migration use the same role (e.g. Neon) no grant is needed.
        console.warn('[Migration] Sequence grant skipped:', grantErr?.message || grantErr);
      }
    }

    // 4. Inspect existing data to prevent any collisions with historical records
    const allRfqs = await db.select({ num: materialRequests.requestNumber }).from(materialRequests);
    const allQuotes = await db.select({ num: quotations.quoteNumber }).from(quotations);
    const allOrders = await db.select({ num: orders.orderNumber }).from(orders);

    const extractMaxNumber = (records: Array<{ num: string | null }>): number => {
      let maxNum = 0;
      for (const r of records) {
        if (!r.num) continue;
        const match = r.num.match(/(\d+)$/);
        if (match && match[1]) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxNum) {
            maxNum = val;
          }
        }
      }
      return maxNum;
    };

    const maxRfq = extractMaxNumber(allRfqs);
    const maxQuote = extractMaxNumber(allQuotes);
    const maxOrder = extractMaxNumber(allOrders);

    // Align sequences to be strictly ahead of any existing records
    const alignSequence = async (seqName: string, maxExisting: number): Promise<number> => {
      try {
        const res = await db.execute(sql`SELECT last_value, is_called FROM ${sql.raw(seqName)};`);
        const currentVal = parseInt(res.rows[0]?.last_value as string, 10) || 1;
        const isCalled = res.rows[0]?.is_called === true;

        const targetVal = Math.max(maxExisting + 1, currentVal, 10);
        if (!isCalled || currentVal < targetVal) {
          await db.execute(sql`SELECT setval(${sql.raw(`'${seqName}'`)}, ${targetVal}, ${isCalled});`);
          return targetVal;
        }
        return currentVal;
      } catch {
        const targetVal = Math.max(maxExisting + 1, 10);
        await db.execute(sql`SELECT setval(${sql.raw(`'${seqName}'`)}, ${targetVal}, false);`);
        return targetVal;
      }
    };

    const rfqSeqVal = await alignSequence('rfq_number_seq', maxRfq);
    const quoteSeqVal = await alignSequence('quote_number_seq', maxQuote);
    const orderSeqVal = await alignSequence('order_number_seq', maxOrder);

    // 5. Authoritative Database Super Admin bootstrap via BOOTSTRAP_SUPER_ADMIN_UID
    const bootstrapSuperAdminUid = process.env.BOOTSTRAP_SUPER_ADMIN_UID;
    if (bootstrapSuperAdminUid) {
      await db.execute(sql`UPDATE users SET role = 'super_admin' WHERE id = ${bootstrapSuperAdminUid};`);
      console.log(`[Migration] Authoritative super_admin role assigned to UID: ${bootstrapSuperAdminUid}`);
    }

    const summary = {
      rfq_number_seq: rfqSeqVal,
      quote_number_seq: quoteSeqVal,
      order_number_seq: orderSeqVal,
    };

    console.log('[Migration] Sequences initialized and aligned successfully:', summary);
    return { success: true, sequencesAligned: summary };
  } finally {
    await pool.end();
  }
}

// Allow standalone execution via `npm run db:migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then((res) => {
      console.log('Migration execution complete:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration execution failed:', err);
      process.exit(1);
    });
}
