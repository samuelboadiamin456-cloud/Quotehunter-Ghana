import React, { useEffect, useState } from 'react';
import { billingApi, AdminBillingOverview } from '../../services/billingApi.ts';
import { InvoiceModal } from './BillingView.tsx';
import type { InvoiceData } from '../../services/billingApi.ts';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const cedis = (n: number) => `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
const label = (v: string) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const statusClass: Record<string, string> = {
  active: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  trialing: 'text-amber-800 bg-amber-50 border-amber-200',
  expired: 'text-rose-800 bg-rose-50 border-rose-200',
};

export const AdminBillingPanel: React.FC = () => {
  const [data, setData] = useState<AdminBillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grantFor, setGrantFor] = useState<{ id: string; name: string } | null>(null);
  const [days, setDays] = useState('30');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const load = () =>
    billingApi.adminOverview().then(setData).catch((e) => setError(e.message || 'Could not load billing'));
  useEffect(() => {
    load();
  }, []);

  const handleClaim = async (id: string, action: 'confirm' | 'reject') => {
    setError(null);
    try {
      await billingApi.adminClaim(id, action);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update that payment');
    }
  };

  const submitGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantFor) return;
    setSaving(true);
    setError(null);
    try {
      await billingApi.adminGrant({
        organizationId: grantFor.id,
        days: parseInt(days, 10),
        amountGhs: amount ? parseFloat(amount) : undefined,
        note,
      });
      setGrantFor(null);
      setDays('30');
      setAmount('');
      setNote('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not extend this account');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-heading">Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Payments, accounts on trial, and accounts that have run out of time.</p>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">{error}</div>}

      {data && (
        <>
          <div className="rounded-md border border-slate-200 bg-white text-sm px-4 py-3 text-slate-700">
            Billing is <strong>{data.enforced ? 'switched on' : 'off (everything is free)'}</strong>. Mobile Money payments go to <strong>{data.momoNumber}</strong>. Online card/MoMo checkout is{' '}
            <strong>{data.paymentsEnabled ? 'ready' : 'not set up'}</strong>. Free trial is {data.trialDays} days. To switch billing off, set{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">BILLING_ENFORCED=false</code> in Render.
          </div>

          {data.claims.length > 0 && (
            <div className="bg-white border border-amber-300 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 font-semibold text-amber-900">
                Mobile Money payments waiting for you ({data.claims.length})
              </div>
              <p className="px-5 pt-3 text-sm text-slate-600">
                Check your Mobile Money history on {data.momoNumber}. Confirm only when the transaction ID and amount match.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-slate-500 text-xs border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-5 font-medium">Sent</th>
                      <th className="py-2.5 px-5 font-medium">Account</th>
                      <th className="py-2.5 px-5 font-medium">Plan</th>
                      <th className="py-2.5 px-5 font-medium">Expected</th>
                      <th className="py-2.5 px-5 font-medium">Transaction ID</th>
                      <th className="py-2.5 px-5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.claims.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-5 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                        <td className="py-3 px-5">{c.organization}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{label(c.plan)}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{cedis(c.amountGhs)}</td>
                        <td className="py-3 px-5 font-mono">{c.momoRef}</td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <button onClick={() => handleClaim(c.id, 'reject')} className="mr-3 text-slate-600 hover:text-rose-700 font-medium">
                            Reject
                          </button>
                          <button onClick={() => handleClaim(c.id, 'confirm')} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md">
                            Money received
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              ['Revenue', cedis(data.totals.revenueGhs)],
              ['Paying', String(data.totals.active)],
              ['On free trial', String(data.totals.trialing)],
              ['Trial ended', String(data.totals.expired)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs text-slate-500">{k}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{v}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">Accounts</div>
            {data.accounts.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">No accounts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-5 font-medium">Name</th>
                      <th className="py-2.5 px-5 font-medium">Type</th>
                      <th className="py-2.5 px-5 font-medium">Status</th>
                      <th className="py-2.5 px-5 font-medium">Access until</th>
                      <th className="py-2.5 px-5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.accounts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-5 font-medium text-slate-900">{a.name}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{label(a.type)}</td>
                        <td className="py-3 px-5">
                          <span className={`inline-block whitespace-nowrap text-xs font-medium border px-2 py-0.5 rounded ${statusClass[a.status]}`}>
                            {a.status === 'trialing' ? 'Free trial' : a.status === 'active' ? 'Paying' : 'Trial ended'}
                          </span>
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">{fmtDate(a.endsAt)}</td>
                        <td className="py-3 px-5 text-right">
                          <button onClick={() => setGrantFor({ id: a.id, name: a.name })} className="text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap">
                            Add time
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">Payments</div>
            {data.payments.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">No payments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-5 font-medium">Date</th>
                      <th className="py-2.5 px-5 font-medium">Invoice</th>
                      <th className="py-2.5 px-5 font-medium">Account</th>
                      <th className="py-2.5 px-5 font-medium">Plan</th>
                      <th className="py-2.5 px-5 font-medium">Amount</th>
                      <th className="py-2.5 px-5 font-medium">Method</th>
                      <th className="py-2.5 px-5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-5 whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{p.invoiceNumber || '—'}</td>
                        <td className="py-3 px-5">{p.organization}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{label(p.plan)}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{cedis(p.amountGhs)}</td>
                        <td className="py-3 px-5 whitespace-nowrap">{p.provider === 'paystack' ? 'Paystack' : p.provider === 'momo_manual' ? 'Mobile Money' : 'Added by admin'}</td>
                        <td className="py-3 px-5 text-right">
                          {p.invoiceNumber && (
                            <button
                              onClick={() => billingApi.invoice(p.id).then((r) => setInvoice(r.invoice)).catch((e) => setError(e.message))}
                              className="text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap"
                            >
                              Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {grantFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={submitGrant} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="font-semibold text-slate-900">Add time for {grantFor.name}</div>
            <p className="text-sm text-slate-500">Use this for Mobile Money paid straight to you, or a free extension. It is recorded in the activity log.</p>
            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Days to add</span>
              <input className={input} type="number" min={1} max={366} value={days} onChange={(e) => setDays(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Amount paid in GH₵ (leave empty for a free extension)</span>
              <input className={input} type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700 font-medium">Reason</span>
              <input className={input} value={note} onChange={(e) => setNote(e.target.value)} minLength={3} maxLength={300} required placeholder="For example: paid by MoMo, ref 123456" />
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setGrantFor(null)} className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">
                Cancel
              </button>
              <button disabled={saving} className="px-3.5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-md">
                {saving ? 'Saving...' : 'Add time'}
              </button>
            </div>
          </form>
        </div>
      )}

      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
};
