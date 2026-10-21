import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { MaterialRequest } from '../../types/index.ts';
import { X, Calculator, ShieldCheck, MapPin, Truck } from 'lucide-react';

interface SubmitQuoteModalProps {
  isOpen: boolean;
  rfq: MaterialRequest;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitQuoteModal: React.FC<SubmitQuoteModalProps> = ({
  isOpen,
  rfq,
  onClose,
  onSubmitted,
}) => {
  const [deliveryCostGhs, setDeliveryCostGhs] = useState<number>(450);
  const [validityDate, setValidityDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [leadTimeDays, setLeadTimeDays] = useState<number>(2);
  const [paymentTerms, setPaymentTerms] = useState<string>('Payment upon delivery inspection');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize line items prices
  const [itemPrices, setItemPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    rfq.items?.forEach(item => {
      const name = item.itemName.toLowerCase();
      if (name.includes('cement')) map[item.id] = 108;
      else if (name.includes('12mm')) map[item.id] = 95;
      else if (name.includes('16mm')) map[item.id] = 165;
      else if (name.includes('sand')) map[item.id] = 1400;
      else if (name.includes('chipping')) map[item.id] = 2200;
      else if (name.includes('block')) map[item.id] = 7;
      else map[item.id] = 50;
    });
    return map;
  });

  const handlePriceChange = (itemId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setItemPrices(prev => ({ ...prev, [itemId]: num }));
  };

  // Preview subtotal
  const previewSubtotal = rfq.items?.reduce((acc, item) => {
    const unitPrice = itemPrices[item.id] || 0;
    return acc + (unitPrice * item.quantity);
  }, 0) || 0;

  const previewTotal = previewSubtotal + deliveryCostGhs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const itemsPayload = (rfq.items || []).map(item => ({
        materialRequestItemId: item.id,
        unitPriceGhs: itemPrices[item.id] || 0,
        isAvailable: true,
        leadTime: `${leadTimeDays} days`,
      }));

      await api.submitQuotation(rfq.id, {
        deliveryCostGhs,
        validityDate,
        leadTimeDays,
        paymentTerms,
        notes,
        items: itemsPayload,
      });

      onClose();
      onSubmitted();
    } catch (err: any) {
      alert('Failed to submit quotation: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Submit Supplier Quotation
            </h2>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono font-semibold">{rfq.requestNumber}</span>
              <span>·</span>
              <span className="truncate max-w-xs">{rfq.title}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Site Destination Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Destination: <strong>{rfq.deliveryLocation}, {rfq.deliveryRegion}</strong></span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Bidding Deadline: {rfq.deadline}
            </div>
          </div>

          {/* Line Items Pricing — Fully Responsive */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800">
                Unit Pricing per Requested Item (GH₵)
              </label>
              <span className="text-[11px] text-slate-500">
                {rfq.items?.length || 0} items requested
              </span>
            </div>

            <div className="space-y-2.5">
              {rfq.items?.map((item, idx) => {
                const unitPrice = itemPrices[item.id] || 0;
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">{item.itemName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Required: <strong className="font-mono text-slate-800">{item.quantity} {item.unit}</strong>
                        {item.specification ? ` · ${item.specification}` : ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Unit Rate (GH₵)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={unitPrice}
                          onChange={e => handlePriceChange(item.id, e.target.value)}
                          className="w-full sm:w-28 text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono tabular-nums text-right font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="text-right sm:w-32">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Line Subtotal
                        </span>
                        <span className="text-xs font-mono tabular-nums font-bold text-slate-900 block mt-1 sm:mt-0">
                          GH₵ {lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Site Delivery & Haulage (GH₵) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={deliveryCostGhs}
                onChange={e => setDeliveryCostGhs(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono tabular-nums focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Time (Days) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={leadTimeDays}
                onChange={e => setLeadTimeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono tabular-nums focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quote Validity Date *
              </label>
              <input
                type="date"
                required
                value={validityDate}
                onChange={e => setValidityDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="e.g. 100% upon delivery inspection"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Delivery Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. 20m3 tipper truck offload; access route confirmed"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Real-time Summary Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-amber-950 space-y-0.5">
              <div>Materials Subtotal: <strong className="font-mono">GH₵ {previewSubtotal.toLocaleString()}</strong></div>
              <div>Site Logistics: <strong className="font-mono">GH₵ {deliveryCostGhs.toLocaleString()}</strong></div>
            </div>
            <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Quotation Value</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                GH₵ {previewTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              {submitting ? 'Submitting Quotation...' : 'Transmit Binding Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
