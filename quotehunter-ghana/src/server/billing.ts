import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { organizations, payments, subscriptions } from '../db/schema.ts';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { logAuditEvent } from './audit.ts';

/**
 * Billing for QuoteHunter Ghana.
 *
 * Model: every organisation gets a free trial (TRIAL_DAYS from sign-up), then needs a paid plan.
 * Suppliers pay slightly more than contractors. Nothing is enforced until BILLING_ENFORCED=true,
 * so you can launch free and switch billing on later with one environment variable.
 *
 * Environment:
 *   PAYSTACK_SECRET_KEY   Paystack secret key (sk_test_... or sk_live_...). Server-side only.
 *   BILLING_ENFORCED      "true" to block bidding / RFQ creation once trial and paid time run out.
 *   TRIAL_DAYS            Free trial length in days (default 30).
 *   APP_URL               Public site address used for the Paystack return link.
 */

export const TRIAL_DAYS = Math.max(0, parseInt(process.env.TRIAL_DAYS || '30', 10) || 30);

export interface Plan {
  id: string;
  orgType: 'contractor' | 'supplier';
  name: string;
  interval: 'monthly' | 'yearly';
  priceGhs: number; // whole cedis
  days: number;
}

// Edit the prices here. Suppliers are priced slightly higher than contractors.
export const PLANS: Plan[] = [
  { id: 'contractor_monthly', orgType: 'contractor', name: 'Contractor Monthly', interval: 'monthly', priceGhs: 60, days: 30 },
  { id: 'contractor_yearly', orgType: 'contractor', name: 'Contractor Yearly', interval: 'yearly', priceGhs: 600, days: 365 },
  { id: 'supplier_monthly', orgType: 'supplier', name: 'Supplier Monthly', interval: 'monthly', priceGhs: 120, days: 30 },
  { id: 'supplier_yearly', orgType: 'supplier', name: 'Supplier Yearly', interval: 'yearly', priceGhs: 1200, days: 365 },
];

const isEnforced = () => process.env.BILLING_ENFORCED === 'true';
const paystackKey = () => process.env.PAYSTACK_SECRET_KEY || '';
const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingStatus = 'trialing' | 'active' | 'expired';

export interface BillingState {
  enforced: boolean;
  status: BillingStatus;
  hasAccess: boolean;
  orgType: string;
  trialEndsAt: string;
  paidUntil: string | null;
  daysLeft: number; // days left in whichever period is running (0 when expired)
  plan: string | null;
}

export async function getBillingState(orgId: string): Promise<BillingState | null> {
  const org = (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
  if (!org) return null;
  const sub = (await db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).limit(1))[0];

  const now = Date.now();
  const trialEnd = org.createdAt.getTime() + TRIAL_DAYS * DAY_MS;
  const paidEnd = sub ? sub.currentPeriodEnd.getTime() : 0;

  let status: BillingStatus = 'expired';
  let endsAt = 0;
  if (paidEnd > now) {
    status = 'active';
    endsAt = paidEnd;
  } else if (trialEnd > now) {
    status = 'trialing';
    endsAt = trialEnd;
  }

  return {
    enforced: isEnforced(),
    status,
    hasAccess: !isEnforced() || status !== 'expired',
    orgType: org.type,
    trialEndsAt: new Date(trialEnd).toISOString(),
    paidUntil: sub ? sub.currentPeriodEnd.toISOString() : null,
    daysLeft: endsAt > now ? Math.ceil((endsAt - now) / DAY_MS) : 0,
    plan: sub?.plan || null,
  };
}

/** Used by the RFQ and quotation routes. Returns true if the request may continue; otherwise it has replied with 402. */
export async function requireBillingAccess(orgId: string | undefined, res: Response): Promise<boolean> {
  if (!isEnforced()) return true;
  if (!orgId) return true; // the route's own organisation check handles this
  const state = await getBillingState(orgId);
  if (!state || state.hasAccess) return true;
  res.status(402).json({
    error: 'Your free trial has ended. Choose a plan under Billing to keep going.',
    code: 'billing_required',
  });
  return false;
}

// ------------------------------------------------------------
// Paystack helpers (secret key never leaves the server)
// ------------------------------------------------------------

async function paystackRequest(path: string, init?: RequestInit): Promise<any> {
  const key = paystackKey();
  if (!key) throw new Error('Payments are not set up yet.');
  const r = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body: any = await r.json().catch(() => ({}));
  if (!r.ok || body.status === false) {
    throw new Error(body.message || `Paystack error (${r.status})`);
  }
  return body.data;
}

/**
 * Marks a payment successful and extends the organisation's paid period. Safe to call many times:
 * the row lock plus the status check make it idempotent, so webhook + return-page cannot double-credit.
 */
export async function fulfillPayment(reference: string, tx: { status: string; amount: number; currency: string }): Promise<boolean> {
  return db.transaction(async (dbx) => {
    const rows = await dbx.select().from(payments).where(eq(payments.reference, reference)).limit(1).for('update');
    const pay = rows[0];
    if (!pay) return false;
    if (pay.status === 'success') return true;

    if (tx.status !== 'success' || tx.amount !== pay.amountPesewas || tx.currency !== pay.currency) {
      if (tx.status === 'failed' || tx.status === 'abandoned') {
        await dbx.update(payments).set({ status: 'failed' }).where(eq(payments.id, pay.id));
      }
      return false;
    }

    const invoiceSeq = await dbx.execute(sql`SELECT nextval('invoice_number_seq') AS n`);
    const n = parseInt(String(invoiceSeq.rows[0]?.n), 10);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
    const now = new Date();

    await dbx.update(payments)
      .set({ status: 'success', paidAt: now, invoiceNumber })
      .where(eq(payments.id, pay.id));

    await extendSubscription(dbx, pay.organizationId, pay.plan, pay.periodDays);
    return true;
  });
}

async function extendSubscription(dbx: any, orgId: string, plan: string, days: number) {
  await dbx.insert(subscriptions)
    .values({ organizationId: orgId, plan, currentPeriodEnd: new Date(0) })
    .onConflictDoNothing();
  const row = (await dbx.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).limit(1).for('update'))[0];
  const base = Math.max(Date.now(), row.currentPeriodEnd.getTime());
  await dbx.update(subscriptions)
    .set({ plan, currentPeriodEnd: new Date(base + days * DAY_MS), updatedAt: new Date() })
    .where(eq(subscriptions.organizationId, orgId));
}

// ------------------------------------------------------------
// Webhook (mounted in app.ts BEFORE express.json, because the signature needs the raw body)
// ------------------------------------------------------------

export async function paystackWebhook(req: Request, res: Response) {
  try {
    const key = paystackKey();
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const sig = String(req.headers['x-paystack-signature'] || '');
    if (!key || !sig) return res.sendStatus(400);

    const expected = crypto.createHmac('sha512', key).update(raw).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.sendStatus(401);

    const event = JSON.parse(raw.toString('utf8'));
    if (event?.event === 'charge.success' && typeof event?.data?.reference === 'string') {
      // Never trust the webhook body for amounts: ask Paystack directly.
      const tx = await paystackRequest(`/transaction/verify/${encodeURIComponent(event.data.reference)}`);
      await fulfillPayment(event.data.reference, tx);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return res.sendStatus(500); // Paystack retries on non-2xx
  }
}

// ------------------------------------------------------------
// Routes (mounted at /api/billing)
// ------------------------------------------------------------

export const billingRouter = Router();
const checkoutLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, name: 'checkout-limiter' });

const orgTypeOf = async (orgId: string) =>
  (await db.select({ type: organizations.type }).from(organizations).where(eq(organizations.id, orgId)).limit(1))[0]?.type;

billingRouter.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization membership required' });
    const state = await getBillingState(orgId);
    if (!state) return res.status(404).json({ error: 'Organization not found' });
    res.json({
      ...state,
      paymentsEnabled: !!paystackKey(),
      trialDays: TRIAL_DAYS,
      plans: PLANS.filter((p) => p.orgType === state.orgType),
    });
  } catch (err) {
    console.error('Billing status error:', err);
    res.status(500).json({ error: 'Could not load billing details' });
  }
});

billingRouter.get('/payments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization membership required' });
    const rows = await db.select().from(payments)
      .where(and(eq(payments.organizationId, orgId), eq(payments.status, 'success')))
      .orderBy(desc(payments.paidAt)).limit(100);
    res.json({ payments: rows });
  } catch (err) {
    console.error('Billing payments error:', err);
    res.status(500).json({ error: 'Could not load payment history' });
  }
});

billingRouter.get('/invoices/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pay = (await db.select().from(payments).where(eq(payments.id, req.params.id)).limit(1))[0];
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    if (!pay || pay.status !== 'success' || (!isAdmin && pay.organizationId !== req.user!.organizationId)) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const org = (await db.select().from(organizations).where(eq(organizations.id, pay.organizationId)).limit(1))[0];
    const plan = PLANS.find((p) => p.id === pay.plan);
    res.json({
      invoice: {
        number: pay.invoiceNumber,
        date: pay.paidAt,
        reference: pay.reference,
        provider: pay.provider,
        plan: plan?.name || pay.plan,
        periodDays: pay.periodDays,
        amountGhs: pay.amountPesewas / 100,
        currency: pay.currency,
        billedTo: { name: org?.name, email: org?.email, phone: org?.phone, address: org?.address, city: org?.city },
      },
    });
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).json({ error: 'Could not load invoice' });
  }
});

const checkoutSchema = z.object({ planId: z.string().min(1).max(60) });

billingRouter.post('/checkout', requireAuth, checkoutLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization membership required' });
    if (!paystackKey()) return res.status(503).json({ error: 'Payments are not switched on yet.' });

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose a plan' });

    const plan = PLANS.find((p) => p.id === parsed.data.planId);
    const type = await orgTypeOf(orgId);
    // Price comes from the server's plan table only. The browser never sends an amount.
    if (!plan || plan.orgType !== type) return res.status(400).json({ error: 'That plan is not available for your account' });

    const reference = 'qh_' + crypto.randomBytes(10).toString('hex');
    const amountPesewas = plan.priceGhs * 100;
    const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    await db.insert(payments).values({
      id: 'pay_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      organizationId: orgId,
      userId: req.user!.uid,
      plan: plan.id,
      provider: 'paystack',
      reference,
      amountPesewas,
      currency: 'GHS',
      status: 'pending',
      periodDays: plan.days,
    });

    const init = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: req.user!.email,
        amount: amountPesewas,
        currency: 'GHS',
        reference,
        callback_url: `${base}/?billing=return`,
        metadata: { organizationId: orgId, plan: plan.id },
      }),
    });

    res.json({ authorizationUrl: init.authorization_url, reference });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(502).json({ error: 'Could not start the payment. Please try again.' });
  }
});

// Called when the user comes back from Paystack. Confirms with Paystack, then returns fresh status.
billingRouter.get('/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reference = String(req.query.reference || '');
    if (!/^qh_[a-f0-9]{20}$/.test(reference)) return res.status(400).json({ error: 'Invalid payment reference' });

    const pay = (await db.select().from(payments).where(eq(payments.reference, reference)).limit(1))[0];
    if (!pay || pay.organizationId !== req.user!.organizationId) return res.status(404).json({ error: 'Payment not found' });

    if (pay.status !== 'success') {
      const tx = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
      await fulfillPayment(reference, tx);
    }
    const fresh = (await db.select().from(payments).where(eq(payments.id, pay.id)).limit(1))[0];
    res.json({ status: fresh.status });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(502).json({ error: 'Could not confirm the payment yet. If you were charged, it will appear shortly.' });
  }
});

// ---------------- Admin ----------------

billingRouter.get('/admin/overview', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select({
      payment: payments,
      orgName: organizations.name,
      orgType: organizations.type,
    })
      .from(payments)
      .innerJoin(organizations, eq(payments.organizationId, organizations.id))
      .where(eq(payments.status, 'success'))
      .orderBy(desc(payments.paidAt))
      .limit(200);

    const orgs = await db.select({ id: organizations.id, name: organizations.name, type: organizations.type, createdAt: organizations.createdAt, paidUntil: subscriptions.currentPeriodEnd, plan: subscriptions.plan })
      .from(organizations)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .where(sql`${organizations.type} IN ('contractor','supplier') AND ${organizations.deletedAt} IS NULL`);

    const now = Date.now();
    const accounts = orgs.map((o) => {
      const trialEnd = o.createdAt.getTime() + TRIAL_DAYS * DAY_MS;
      const paidEnd = o.paidUntil ? o.paidUntil.getTime() : 0;
      const status = paidEnd > now ? 'active' : trialEnd > now ? 'trialing' : 'expired';
      return { id: o.id, name: o.name, type: o.type, plan: o.plan, status, endsAt: new Date(Math.max(paidEnd, trialEnd)).toISOString() };
    });

    const totalPesewas = rows.reduce((sum, r) => sum + r.payment.amountPesewas, 0);
    res.json({
      enforced: isEnforced(),
      paymentsEnabled: !!paystackKey(),
      trialDays: TRIAL_DAYS,
      totals: {
        revenueGhs: totalPesewas / 100,
        active: accounts.filter((a) => a.status === 'active').length,
        trialing: accounts.filter((a) => a.status === 'trialing').length,
        expired: accounts.filter((a) => a.status === 'expired').length,
      },
      payments: rows.map((r) => ({
        id: r.payment.id,
        invoiceNumber: r.payment.invoiceNumber,
        organizationId: r.payment.organizationId,
        organization: r.orgName,
        orgType: r.orgType,
        plan: r.payment.plan,
        provider: r.payment.provider,
        amountGhs: r.payment.amountPesewas / 100,
        paidAt: r.payment.paidAt,
        note: r.payment.note,
      })),
      accounts: accounts.sort((a, b) => (a.status === 'expired' ? -1 : 1) - (b.status === 'expired' ? -1 : 1)),
    });
  } catch (err) {
    console.error('Admin billing error:', err);
    res.status(500).json({ error: 'Could not load billing overview' });
  }
});

const grantSchema = z.object({
  organizationId: z.string().min(1).max(80),
  days: z.number().int().min(1).max(366),
  amountGhs: z.number().min(0).max(100000).optional(),
  note: z.string().min(3).max(300),
});

// Extend an account by hand: Mobile Money paid straight to you, a goodwill extension, a refund fix.
billingRouter.post('/admin/grant', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = grantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid request' });
    const { organizationId, days, amountGhs = 0, note } = parsed.data;

    const org = (await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
    if (!org || (org.type !== 'contractor' && org.type !== 'supplier')) return res.status(404).json({ error: 'Account not found' });

    const planId = days >= 300 ? `${org.type}_yearly` : `${org.type}_monthly`;
    await db.transaction(async (dbx) => {
      let invoiceNumber: string | null = null;
      if (amountGhs > 0) {
        const r = await dbx.execute(sql`SELECT nextval('invoice_number_seq') AS n`);
        invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(String(r.rows[0]?.n), 10)).padStart(5, '0')}`;
      }
      await dbx.insert(payments).values({
        id: 'pay_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        organizationId,
        userId: req.user!.uid,
        plan: planId,
        provider: 'manual',
        reference: 'man_' + crypto.randomBytes(10).toString('hex'),
        amountPesewas: Math.round(amountGhs * 100),
        currency: 'GHS',
        status: 'success',
        periodDays: days,
        invoiceNumber,
        note,
        paidAt: new Date(),
      });
      await extendSubscription(dbx, organizationId, planId, days);
    });

    await logAuditEvent({
      actorUserId: req.user!.uid,
      organizationId,
      action: 'billing.manual_grant',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: { days, amountGhs, note },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Grant error:', err);
    res.status(500).json({ error: 'Could not extend this account' });
  }
});
