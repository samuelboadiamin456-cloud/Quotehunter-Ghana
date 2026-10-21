import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Order } from '../../types/index.ts';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar, 
  FileText, 
  ArrowRight,
  Star
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getOrders();
      setOrders(res);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await api.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Order Placed</span>;
      case 'confirmed':
        return <span className="text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">Confirmed by Supplier</span>;
      case 'in_transit':
        return <span className="text-[11px] font-medium text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">In Transit / Dispatched</span>;
      case 'delivered':
        return <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Delivered on Site</span>;
      case 'completed':
        return <span className="text-[11px] font-medium text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">Completed & Verified</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h1 className="text-xl font-bold text-slate-900 font-heading">
          Procurement Purchase Orders & Deliveries
        </h1>
        <div className="text-xs text-slate-500 mt-1">
          Track official purchase contracts, scheduled site deliveries, and supplier performance.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading procurement orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-900">No purchase orders placed yet</div>
            <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When a contractor accepts a supplier quotation, a legally binding purchase order will be generated here.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {orders.map(order => (
              <div key={order.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {order.orderNumber}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>Buyer: {order.buyer?.name || 'Contractor'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {order.deliveryAddress}, {order.deliveryRegion}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {order.deliveryContactName} ({order.deliveryContactPhone})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-between">
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      GH₵ {order.totalAmountGhs.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {order.scheduledDeliveryDate ? `Scheduled: ${order.scheduledDeliveryDate}` : 'Immediate Fulfillment'}
                    </div>
                  </div>
                </div>

                {/* Fulfillment Status Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    {order.notes ? `Instructions: ${order.notes}` : 'Standard commercial offloading protocol'}
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.role === 'supplier' && (
                      <>
                        {order.status === 'placed' && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded text-xs transition-colors"
                          >
                            Confirm Order
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, 'in_transit')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-xs transition-colors"
                          >
                            Dispatch Trucks / In Transit
                          </button>
                        )}
                        {order.status === 'in_transit' && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs transition-colors"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </>
                    )}

                    {user?.role === 'contractor' && order.status === 'delivered' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        disabled={updatingId === order.id}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded text-xs transition-colors"
                      >
                        Inspect & Complete Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
