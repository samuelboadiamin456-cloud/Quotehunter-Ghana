import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { ComparisonMatrixData } from '../../types/index.ts';
import { GHANA_REGIONS } from '../../constants/ghana.ts';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Truck, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  MapPin
} from 'lucide-react';

interface QuoteComparisonViewProps {
  rfqId: string;
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
}

export const QuoteComparisonView: React.FC<QuoteComparisonViewProps> = ({
  rfqId,
  onBack,
  onOrderCreated,
}) => {
  const [data, setData] = useState<ComparisonMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);

  // Order acceptance inputs
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getComparisonMatrix(rfqId);
      setData(res);
      if (res.rfq) {
        setDeliveryAddress(res.rfq.deliveryLocation);
        setDeliveryRegion(res.rfq.deliveryRegion);
      }
    } catch (err: any) {
      console.error('Failed to load quote comparison matrix:', err);
      setError(err.message || 'Failed to load quotation comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [rfqId]);

  const handleOpenAcceptModal = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setAcceptModalOpen(true);
  };

  const handleConfirmAcceptQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;

    try {
      setAcceptingQuote(true);
      const res = await api.acceptQuotation(selectedQuoteId, {
        deliveryAddress,
        deliveryRegion,
        contactName,
        contactPhone,
        scheduledDate,
        notes: orderNotes,
      });

      setAcceptModalOpen(false);
      onOrderCreated(res.order.id);
    } catch (err: any) {
      alert('Failed to accept quotation: ' + err.message);
    } finally {
      setAcceptingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
        Loading quotation comparison matrix...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <div className="text-sm font-semibold text-slate-900">{error || 'Could not load quotation data'}</div>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
        >
          Return to RFQs
        </button>
      </div>
    );
  }

  const { rfq, items, suppliers, matrix } = data;

  return (
    <div className="space-y-6">
      {/* Header and Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-5">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to RFQs
          </button>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            Quotation Comparison Matrix: {rfq.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="font-mono">{rfq.requestNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {rfq.deliveryLocation}, {rfq.deliveryRegion}
            </span>
            <span aria-hidden="true">·</span>
            <span>Deadline: {rfq.deadline}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900 font-mono tabular-nums">
              {suppliers.length} Quotation{suppliers.length !== 1 ? 's' : ''} Received
            </div>
            <div className="text-[11px] text-slate-500">
              {rfq.status === 'awarded' ? 'Awarded / Order Generated' : 'Open for Decision'}
            </div>
          </div>
        </div>
      </div>

      {/* When no suppliers have submitted quotes yet */}
      {suppliers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Waiting for Supplier Quotations</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            This request has been broadcast to verified suppliers in {rfq.deliveryRegion}. As quotations arrive, they will appear here side-by-side for comparison.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
            Tip: Switch to "Supplier Mode" in the top bar to submit a test quotation for this request.
          </div>
        </div>
      ) : (
        /* Side-by-Side Comparison Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold text-slate-700 w-64 min-w-[240px]">
                    Material Specification
                  </th>
                  <th className="py-3.5 px-3 font-semibold text-slate-600 text-center w-28">
                    Quantity
                  </th>
                  {suppliers.map(s => (
                    <th key={s.quoteId} className="py-3.5 px-4 min-w-[200px] border-l border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{s.supplierName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="capitalize">{s.verificationStatus}</span>
                            <span>·</span>
                            <span>Rating: {s.rating}★</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Ref: {s.quoteNumber}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {matrix.map((row) => (
                  <tr key={row.item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{row.item.itemName}</div>
                      {row.item.specification && (
                        <div className="text-[11px] text-slate-500">{row.item.specification}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.item.quantity.toLocaleString()} {row.item.unit}
                    </td>

                    {suppliers.map(s => {
                      const offer = row.supplierOffers[s.quoteId];
                      return (
                        <td key={s.quoteId} className="py-3 px-4 border-l border-slate-200">
                          {offer && offer.unitPriceGhs !== null ? (
                            <div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900">
                                GH₵ {offer.unitPriceGhs.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {row.item.unit}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                Subtotal: GH₵ {(offer.subtotalGhs || 0).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not quoted</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Delivery Fee Row */}
                <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                  <td className="py-2.5 px-4 font-semibold text-slate-700" colSpan={2}>
                    Site Delivery & Logistics Cost
                  </td>
                  {suppliers.map(s => (
                    <td key={s.quoteId} className="py-2.5 px-4 border-l border-slate-200 font-mono tabular-nums font-medium text-slate-800">
                      GH₵ {s.deliveryCostGhs.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Lead Time & Validity Row */}
                <tr className="bg-slate-50/50">
                  <td className="py-2 px-4 text-slate-600 font-medium" colSpan={2}>
                    Delivery Lead Time & Quote Validity
                  </td>
                  {suppliers.map(s => (
                    <td key={s.quoteId} className="py-2 px-4 border-l border-slate-200 text-[11px] text-slate-600">
                      <div>Lead Time: <span className="font-semibold text-slate-800">{s.leadTimeDays} days</span></div>
                      <div className="text-slate-500">Valid until: {s.validityDate}</div>
                    </td>
                  ))}
                </tr>

                {/* Total Calculated Price Row */}
                <tr className="bg-amber-50/60 border-t-2 border-amber-200 font-bold">
                  <td className="py-4 px-4 text-slate-900 text-sm font-heading" colSpan={2}>
                    TOTAL QUOTATION VALUE
                  </td>
                  {suppliers.map(s => (
                    <td key={s.quoteId} className="py-4 px-4 border-l border-amber-200">
                      <div className="text-base text-slate-900 font-mono tabular-nums">
                        GH₵ {s.totalGhs.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 uppercase mt-0.5">
                        Inclusive of Materials + Delivery
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Award / Action Row */}
                <tr className="border-t border-slate-200 bg-white">
                  <td className="py-3 px-4 text-slate-500 text-xs italic" colSpan={2}>
                    Compare pricing and lead times carefully before awarding.
                  </td>
                  {suppliers.map(s => (
                    <td key={s.quoteId} className="py-3 px-4 border-l border-slate-200">
                      {s.status === 'accepted' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Quotation Awarded
                        </div>
                      ) : rfq.status === 'awarded' ? (
                        <span className="text-xs text-slate-400">RFQ already awarded</span>
                      ) : (
                        <button
                          onClick={() => handleOpenAcceptModal(s.quoteId)}
                          className="w-full px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shadow-xs"
                        >
                          Accept & Generate Order
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Accept Quote and Generate Order */}
      {acceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Confirm Order Placement
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Accepting this quotation will create a formal Purchase Order and notify the supplier to schedule fulfillment.
              </p>
            </div>

            <form onSubmit={handleConfirmAcceptQuote} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Site Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ghana Region (All 16 Regions) *
                  </label>
                  <select
                    value={deliveryRegion}
                    onChange={e => setDeliveryRegion(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {GHANA_REGIONS.map(reg => (
                      <option key={reg.name} value={reg.name}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Requested Delivery Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Site Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Site Engineer Mensah"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+233 24 000 0000"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivery Access Notes / Unloading Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tipper access available via main Spintex arterial; crane required for rebar unloading."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAcceptModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptingQuote}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                >
                  {acceptingQuote ? 'Generating Order...' : 'Confirm & Award Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
