import React, { useEffect, useState } from 'react';
import { billingApi, BillingStatusInfo, PaymentRow, InvoiceData } from '../../services/billingApi.ts';
import { X } from 'lucide-react';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const cedis = (n: number) => `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const BillingView: React.FC = () => {
  const [status, setStatus] = useState<BillingStatusInfo | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([billingApi.status(), billingApi.payments()]);
      setStatus(s);
      setHistory(p.payments);
    } catch (e: any) {
      setError(e.message || 'Could not load billing');
    }
  };

  useEffect(() => {
    // Coming back from Paystack: confirm the payment, then tidy the address bar.
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (params.get('billing') === 'return' && reference) {
      billingApi
        .verify(reference)
        .then((r) =>
          setNotice(r.status === 'success' ? 'Payment received. Thank you, your plan is active.' : 'We have not received that payment yet. If you were charged, it will show here shortly.')
        )
        .catch((e) => setNotice(e.message))
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
          load();
        });
    } else {
      load();
    }
  }, []);

  const pay = async (planId: string) => {
    setError(null);
    setBusyPlan(planId);
    try {
      const { authorizationUrl } = await billingApi.checkout(planId);
      window.location.href = authorizationUrl;
    } catch (e: any) {
      setError(e.message || 'Could not start the payment');
      setBusyPlan(null);
    }
  };

  const openInvoice = async (id: string) => {
    try {
      setInvoice((await billingApi.invoice(id)).invoice);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!status && !error) return <div className="text-sm text-slate-500">Loading billing...</div>;

  const heading =
    status?.status === 'active'
      ? `Your plan is active until ${fmtDate(status.paidUntil)}`
      : status?.status === 'trialing'
      ? `Free trial: ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left`
      : 'Your free trial has ended';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your plan, payments and invoices.</p>
      </div>

      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-4 py-3">{notice}</div>}
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">{error}</div>}

      {status && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-lg font-semibold text-slate-900">{heading}</div>
            <p className="text-sm text-slate-500 mt-1">
              {!status.enforced
                ? 'Everything is free for now. You can pay ahead to keep your place when billing starts.'
                : status.status === 'expired'
                ? 'Choose a plan below to keep posting requests and sending quotes.'
                : status.status === 'trialing'
                ? `Free trial ends on ${fmtDate(status.trialEndsAt)}. Choose a plan any time to carry on without a break.`
                : 'Paying again before it ends adds time on top of what you have left.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {status.plans.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
                <div className="text-sm font-medium text-slate-500">{p.interval === 'monthly' ? 'Monthly' : 'Yearly'}</div>
                <div className="text-3xl font-bold text-slate-900">
                  {cedis(p.priceGhs)}
                  <span className="text-sm font-medium text-slate-500"> / {p.interval === 'monthly' ? 'month' : 'year'}</span>
                </div>
                {p.interval === 'yearly' && (
                  <div className="text-sm text-slate-500">Works out at {cedis(Math.round(p.priceGhs / 12))} a month.</div>
                )}
                <button
                  onClick={() => pay(p.id)}
                  disabled={!status.paymentsEnabled || busyPlan !== null}
                  className="mt-auto whitespace-nowrap px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-sm rounded-md transition-colors"
                >
                  {busyPlan === p.id ? 'Opening Paystack...' : 'Pay with Paystack'}
                </button>
              </div>
            ))}
          </div>
          {!status.paymentsEnabled && (
            <p className="text-sm text-slate-500">Online payment is not switched on yet. Check back soon.</p>
          )}
          <p className="text-xs text-slate-500">Pay by Mobile Money or card. Payments are handled by Paystack, and we never see your card or Mobile Money PIN.</p>
        </>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">Payment history</div>
        {history.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5 font-medium">Date</th>
                  <th className="py-2.5 px-5 font-medium">Invoice</th>
                  <th className="py-2.5 px-5 font-medium">Plan</th>
                  <th className="py-2.5 px-5 font-medium">Amount</th>
                  <th className="py-2.5 px-5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-5 whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{p.invoiceNumber || '—'}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{p.plan.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{cedis(p.amountPesewas / 100)}</td>
                    <td className="py-3 px-5 text-right">
                      {p.invoiceNumber && (
                        <button onClick={() => openInvoice(p.id)} className="text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap">
                          View invoice
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

      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
};

export const InvoiceModal: React.FC<{ invoice: InvoiceData; onClose: () => void }> = ({ invoice, onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto print:bg-white print:p-0">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-xl my-8 print:shadow-none print:my-0" id="qh-invoice">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden">
        <div className="font-semibold text-slate-900">Invoice</div>
        <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-6 text-sm text-slate-800">
        <div className="flex justify-between gap-6">
          <div>
            <div className="text-lg font-bold text-slate-900">QuoteHunter Ghana</div>
            <div className="text-slate-500">Construction materials marketplace</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{invoice.number}</div>
            <div className="text-slate-500">{fmtDate(invoice.date)}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Billed to</div>
          <div className="font-semibold">{invoice.billedTo.name}</div>
          {invoice.billedTo.email && <div className="text-slate-600">{invoice.billedTo.email}</div>}
          {invoice.billedTo.phone && <div className="text-slate-600">{invoice.billedTo.phone}</div>}
          {(invoice.billedTo.address || invoice.billedTo.city) && (
            <div className="text-slate-600">{[invoice.billedTo.address, invoice.billedTo.city].filter(Boolean).join(', ')}</div>
          )}
        </div>

        <table className="w-full text-left">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">
                {invoice.plan}
                <div className="text-xs text-slate-500">{invoice.periodDays} days of access</div>
              </td>
              <td className="py-3 text-right">{cedis(invoice.amountGhs)}</td>
            </tr>
            <tr>
              <td className="py-3 font-semibold">Total paid</td>
              <td className="py-3 text-right font-semibold">{cedis(invoice.amountGhs)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs text-slate-500">
          Payment reference: {invoice.reference} · Paid via {invoice.provider === 'paystack' ? 'Paystack' : 'manual payment'}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 print:hidden">
        <button onClick={onClose} className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">
          Close
        </button>
        <button onClick={() => window.print()} className="px-3.5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md">
          Print or save as PDF
        </button>
      </div>
    </div>
  </div>
);
