import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { MaterialRequest } from '../../types/index.ts';
import { GHANA_REGIONS } from '../../constants/ghana.ts';
import { FileText, Plus, MapPin, Calendar, Clock, ArrowRight, UploadCloud, Filter } from 'lucide-react';
import { SubmitQuoteModal } from '../supplier/SubmitQuoteModal.tsx';

interface RfqListViewProps {
  onOpenCreateRfq: () => void;
  onOpenBoqImport: () => void;
  onSelectRfq: (id: string) => void;
}

export const RfqListView: React.FC<RfqListViewProps> = ({
  onOpenCreateRfq,
  onOpenBoqImport,
  onSelectRfq,
}) => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'awarded'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedRfqForQuote, setSelectedRfqForQuote] = useState<MaterialRequest | null>(null);

  const loadRfqs = async () => {
    try {
      setLoading(true);
      const res = await api.getRfqs();
      setRfqs(res);
    } catch (err) {
      console.error('Failed to load RFQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRfqs();
  }, [user?.role]);

  const filteredRfqs = rfqs.filter(r => {
    if (filter === 'open' && r.status !== 'open' && r.status !== 'reviewing') return false;
    if (filter === 'awarded' && r.status !== 'awarded') return false;
    if (regionFilter !== 'all' && r.deliveryRegion !== regionFilter && r.project?.region !== regionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Segmented Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            {user?.role === 'supplier' ? 'Open Contractor RFQs for Bidding' : 'Procurement Material Requests (RFQs)'}
          </h1>
          <div className="text-xs text-slate-500 mt-0.5">
            {user?.role === 'supplier' 
              ? 'Browse live construction material demand across Ghana regions.'
              : 'Track material requests and review comparable supplier quotations.'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ghana 16-Region Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-700"
            >
              <option value="all">All 16 Regions</option>
              {GHANA_REGIONS.map(reg => (
                <option key={reg.name} value={reg.name}>{reg.name}</option>
              ))}
            </select>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All RFQs
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'open' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter('awarded')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'awarded' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awarded
            </button>
          </div>

          {user?.role === 'contractor' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenBoqImport}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                Import BOQ
              </button>
              <button
                onClick={onOpenCreateRfq}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                New RFQ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RFQ List Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading material requests...</div>
        ) : filteredRfqs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-900">No requests match this filter</div>
            <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {user?.role === 'contractor'
                ? 'Create a new material RFQ or import a BOQ spreadsheet to get started.'
                : 'No open requests currently in your service territory.'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRfqs.map(rfq => (
              <div key={rfq.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm font-heading">{rfq.title}</span>
                      <span className="font-mono text-xs text-slate-500">{rfq.requestNumber}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        rfq.status === 'awarded' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {rfq.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
                      <span>Project: <strong>{rfq.project?.name || 'Project'}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {rfq.deliveryLocation}, {rfq.deliveryRegion}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: {rfq.deadline}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {user?.role === 'contractor' ? (
                      <button
                        onClick={() => onSelectRfq(rfq.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        Compare Quotes ({(rfq.quotesReceivedCount || 0)})
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const full = await api.getRfq(rfq.id);
                          setSelectedRfqForQuote(full);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                      >
                        Submit Quotation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRfqForQuote && (
        <SubmitQuoteModal
          isOpen={true}
          rfq={selectedRfqForQuote}
          onClose={() => setSelectedRfqForQuote(null)}
          onSubmitted={() => {
            setSelectedRfqForQuote(null);
            loadRfqs();
          }}
        />
      )}
    </div>
  );
};
