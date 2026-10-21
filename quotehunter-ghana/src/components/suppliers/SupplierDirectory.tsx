import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { SupplierProfile } from '../../types/index.ts';
import { GHANA_REGIONS } from '../../constants/ghana.ts';
import { ShieldCheck, MapPin, Truck, Phone, Star, Filter } from 'lucide-react';

export const SupplierDirectory: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadSuppliers = async (region?: string) => {
    try {
      setLoading(true);
      const res = await api.getSuppliers(region === 'all' ? undefined : region);
      setSuppliers(res);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(selectedRegion);
  }, [selectedRegion]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            Verified Ghanaian Material Suppliers
          </h1>
          <div className="text-xs text-slate-500 mt-1">
            Certified distributors with verified Registrar General business registration & GRA tax compliance.
          </div>
        </div>

        {/* Region Filter with All 16 Regions */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-md bg-white font-medium"
          >
            <option value="all">All 16 Ghana Regions</option>
            {GHANA_REGIONS.map(reg => (
              <option key={reg.name} value={reg.name}>
                {reg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-400">
            Loading verified suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
            No verified suppliers found for the selected region.
          </div>
        ) : (
          suppliers.map(sup => (
            <div key={sup.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-start justify-between">
                  <div className="font-bold text-slate-900 text-sm font-heading">
                    {sup.organization?.name}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.organization?.city}, {sup.organization?.region}</span>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-3">
                  {sup.businessDescription || 'Wholesale supplier of building and construction materials.'}
                </p>

                {sup.deliveryFleetInfo && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
                    <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{sup.deliveryFleetInfo}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    {sup.successfulOrders > 0 ? `${sup.rating} ★ Rating` : 'Not enough transaction history yet'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {sup.successfulOrders} Orders Delivered
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {sup.yearsInBusiness} yrs active
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
