import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

/**
 * Concurrency-safe identifier generation for RFQs, Quotations, and Orders.
 * Uses atomic PostgreSQL sequences (rfq_number_seq, quote_number_seq, order_number_seq)
 * to guarantee strict uniqueness and monotonic order without collisions or race conditions.
 *
 * Example generated identifiers:
 * - RFQ-GH-2026-000012
 * - QUO-GH-2026-000012
 * - ORD-GH-2026-000012
 */

export async function generateSafeRfqNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`SELECT nextval('rfq_number_seq') as val`);
  const seqVal = res.rows[0]?.val ?? 1;
  return `RFQ-GH-${year}-${String(seqVal).padStart(6, '0')}`;
}

export async function generateSafeQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`SELECT nextval('quote_number_seq') as val`);
  const seqVal = res.rows[0]?.val ?? 1;
  return `QUO-GH-${year}-${String(seqVal).padStart(6, '0')}`;
}

export async function generateSafeOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`SELECT nextval('order_number_seq') as val`);
  const seqVal = res.rows[0]?.val ?? 1;
  return `ORD-GH-${year}-${String(seqVal).padStart(6, '0')}`;
}
