import { AnimatedNumber } from '../common/AnimatedNumber.tsx';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { MaterialRequest, Order, SupplierProfile } from '../../types/index.ts';
import { 
  Building2, 
  FileText, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { SubmitQuoteModal } from './SubmitQuoteModal.tsx';

interface SupplierDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onNavigateTab }) => {
  const { currentOrg, supplierProfile } = useAuth();
  const [rfqs, setRfqs] = useState<MaterialRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRfqToBid, setSelectedRfqToBid] = useState<MaterialRequest | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rfqList, orderList] = await Promise.all([
        api.getRfqs(),
        api.getOrders(),
      ]);
      setRfqs(rfqList);
      setOrders(orderList);
    } catch (err) {
      console.error('Failed to load supplier dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const activeDeliveries = orders.filter(o => o.status === 'confirmed' || o.status === 'in_transit').length;
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;

  return (
    <div className="space-y-6">
      {/* Editorial Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Supplier Quotation & Delivery Operations
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {currentOrg?.name || 'Accra Building Materials & Supplies Ltd'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Supplier
              </span>
              <span aria-hidden="true">·</span>
              <span>Warehouse: Tema Light Industrial</span>
              <span aria-hidden="true">·</span>
              <span>Rating: {supplierProfile?.rating || '4.85'}★</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Service Regions: Greater Accra, Eastern, Central
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Available RFQs</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            <AnimatedNumber value={rfqs.length} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active requests to bid on</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Orders Won</div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
            <AnimatedNumber value={orders.length} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awarded quotations</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Active Deliveries</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            <AnimatedNumber value={activeDeliveries} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Confirmed or in transit</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Fulfilled Orders</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            <AnimatedNumber value={completedOrders} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Delivered successfully</div>
        </div>
      </div>

      {/* Open RFQs for Bidding */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Open Contractor Requests (RFQ Opportunities)
            </h2>
            <div className="text-xs text-slate-500">
              Submit binding prices and delivery terms for contractor projects
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading open RFQs...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No open contractor material requests in your region right now.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4">RFQ Ref / Title</th>
                  <th className="py-2.5 px-4">Contractor / Firm</th>
                  <th className="py-2.5 px-4">Site Delivery Destination</th>
                  <th className="py-2.5 px-4">Bidding Deadline</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfqs.map(rfq => (
                  <tr key={rfq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rfq.title}</div>
                      <div className="text-[11px] font-mono text-slate-500">{rfq.requestNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{rfq.organization?.name || 'Contractor'}</div>
                      <div className="text-[11px] text-slate-400">Project: {rfq.project?.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {rfq.deliveryLocation}, {rfq.deliveryRegion}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {rfq.deadline}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={async () => {
                          // Fetch full rfq details with items
                          const full = await api.getRfq(rfq.id);
                          setSelectedRfqToBid(full);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                      >
                        Submit Quotation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quote Submission Modal */}
      {selectedRfqToBid && (
        <SubmitQuoteModal
          isOpen={true}
          rfq={selectedRfqToBid}
          onClose={() => setSelectedRfqToBid(null)}
          onSubmitted={() => {
            setSelectedRfqToBid(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
