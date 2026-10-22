export interface BillingPlan {
  id: string;
  orgType: 'contractor' | 'supplier';
  name: string;
  interval: 'monthly' | 'yearly';
  priceGhs: number;
  days: number;
}

export interface BillingStatusInfo {
  enforced: boolean;
  status: 'trialing' | 'active' | 'expired';
  hasAccess: boolean;
  orgType: string;
  trialEndsAt: string;
  paidUntil: string | null;
  daysLeft: number;
  plan: string | null;
  paymentsEnabled: boolean;
  trialDays: number;
  plans: BillingPlan[];
}

export interface PaymentRow {
  id: string;
  plan: string;
  provider: string;
  reference: string;
  amountPesewas: number;
  currency: string;
  invoiceNumber: string | null;
  periodDays: number;
  paidAt: string | null;
}

export interface InvoiceData {
  number: string | null;
  date: string | null;
  reference: string;
  provider: string;
  plan: string;
  periodDays: number;
  amountGhs: number;
  currency: string;
  billedTo: { name?: string; email?: string; phone?: string | null; address?: string | null; city?: string | null };
}

export interface AdminBillingOverview {
  enforced: boolean;
  paymentsEnabled: boolean;
  trialDays: number;
  totals: { revenueGhs: number; active: number; trialing: number; expired: number };
  payments: Array<{
    id: string;
    invoiceNumber: string | null;
    organizationId: string;
    organization: string;
    orgType: string;
    plan: string;
    provider: string;
    amountGhs: number;
    paidAt: string | null;
    note: string | null;
  }>;
  accounts: Array<{ id: string; name: string; type: string; plan: string | null; status: string; endsAt: string }>;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('qh_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/billing${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      msg = (await res.json()).error || msg;
    } catch {
      msg = `${res.status} ${res.statusText}`;
    }
    throw new Error(msg);
  }
  return res.json();
}

export const billingApi = {
  status: () => call<BillingStatusInfo>('/status'),
  payments: () => call<{ payments: PaymentRow[] }>('/payments'),
  invoice: (id: string) => call<{ invoice: InvoiceData }>(`/invoices/${encodeURIComponent(id)}`),
  checkout: (planId: string) => call<{ authorizationUrl: string }>('/checkout', { method: 'POST', body: JSON.stringify({ planId }) }),
  verify: (reference: string) => call<{ status: string }>(`/verify?reference=${encodeURIComponent(reference)}`),
  adminOverview: () => call<AdminBillingOverview>('/admin/overview'),
  adminGrant: (body: { organizationId: string; days: number; amountGhs?: number; note: string }) =>
    call<{ success: boolean }>('/admin/grant', { method: 'POST', body: JSON.stringify(body) }),
};
