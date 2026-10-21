import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Project, MaterialRequest, Order } from '../../types/index.ts';
import { GHANA_REGIONS } from '../../constants/ghana.ts';
import { 
  Building2, 
  FileText, 
  Plus, 
  UploadCloud, 
  ArrowRight, 
  MapPin, 
  Calendar,
  CheckCircle2,
  Filter,
  XCircle,
  FolderKanban
} from 'lucide-react';

interface ContractorDashboardProps {
  onOpenCreateRfq: (projId?: string) => void;
  onOpenBoqImport: () => void;
  onOpenNewProject: () => void;
  onSelectRfq: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ContractorDashboard: React.FC<ContractorDashboardProps> = ({
  onOpenCreateRfq,
  onOpenBoqImport,
  onOpenNewProject,
  onSelectRfq,
  onNavigateTab,
}) => {
  const { currentOrg } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [rfqs, setRfqs] = useState<MaterialRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, rfqData, orderData] = await Promise.all([
        api.getProjects(),
        api.getRfqs(),
        api.getOrders(),
      ]);
      setProjects(projData);
      setRfqs(rfqData);
      setOrders(orderData);
    } catch (err) {
      console.error('Failed to load contractor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  // Active Selected Project Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  // Filter RFQs based on selected project and region
  let filteredRfqs = rfqs;
  if (selectedProjectId) {
    filteredRfqs = filteredRfqs.filter(r => r.projectId === selectedProjectId);
  }
  if (selectedRegionFilter) {
    filteredRfqs = filteredRfqs.filter(r => r.deliveryRegion === selectedRegionFilter || r.project?.region === selectedRegionFilter);
  }

  const openRfqsCount = rfqs.filter(r => r.status === 'open' || r.status === 'reviewing').length;
  const quotesCountTotal = rfqs.reduce((acc, r) => acc + (r.quotesReceivedCount || 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Editorial Welcome & Quick Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Contractor Procurement Workspace
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {currentOrg?.name || 'Prime Build Construction Ghana Ltd'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Verified General Contractor</span>
              <span aria-hidden="true">·</span>
              <span>Primary Hub: {currentOrg?.region || 'Greater Accra'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{projects.length} Registered Project Sites</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenBoqImport}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              Import BOQ (CSV)
            </button>
            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              New Project
            </button>
            <button
              onClick={() => onOpenCreateRfq()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Material RFQ
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Registered Projects</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {projects.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active site locations in Ghana</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Open RFQs</div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
            {openRfqsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Accepting supplier bids</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Quotes Received</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {quotesCountTotal}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across active requests</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Active Orders</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {activeOrdersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In fulfillment or transit</div>
        </div>
      </div>

      {/* Ghana 16 Administrative Regions Filter & Explorer Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Ghana Procurement Regional Coverage (All 16 Regions)
            </h3>
          </div>
          {selectedRegionFilter && (
            <button
              onClick={() => setSelectedRegionFilter(null)}
              className="text-[11px] font-semibold text-amber-800 hover:underline self-start sm:self-auto"
            >
              Show All Regions
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setSelectedRegionFilter(null)}
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
              !selectedRegionFilter
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All 16 Regions
          </button>
          {GHANA_REGIONS.map(reg => {
            const hasProjectsInRegion = projects.some(p => p.region === reg.name);
            const isSelected = selectedRegionFilter === reg.name;

            return (
              <button
                key={reg.name}
                onClick={() => setSelectedRegionFilter(isSelected ? null : reg.name)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : hasProjectsInRegion
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{reg.name}</span>
                {hasProjectsInRegion && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: RFQs Table & Interactive Select Project Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Material Requests Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Active Material Requests (RFQs)
                </h2>
                {activeProject && (
                  <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                    Filtered: {activeProject.name}
                    <button onClick={() => setSelectedProjectId(null)} className="hover:text-amber-950">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {activeProject 
                  ? `Showing procurement packages for ${activeProject.name}`
                  : 'Compare incoming supplier quotes side-by-side across all active projects'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedProjectId && (
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Show All Projects
                </button>
              )}
              <button
                onClick={() => onNavigateTab('rfqs')}
                className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0"
              >
                View all RFQs
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-0 overflow-x-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading procurement requests...</div>
            ) : filteredRfqs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-semibold text-slate-900">
                  {selectedProjectId ? `No RFQs created for ${activeProject?.name} yet` : 'No active material requests yet'}
                </div>
                <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Create a material request or import a BOQ spreadsheet to receive competitive supplier quotations.
                </div>
                <button
                  onClick={() => onOpenCreateRfq(selectedProjectId || undefined)}
                  className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800"
                >
                  Create Material RFQ
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">RFQ Ref / Title</th>
                    <th className="py-2.5 px-4">Project / Site</th>
                    <th className="py-2.5 px-4">Deadline</th>
                    <th className="py-2.5 px-4 text-center">Quotes</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{rfq.title}</div>
                        <div className="text-[11px] font-mono text-slate-500">{rfq.requestNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{rfq.project?.name || 'Project'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{rfq.deliveryLocation}, {rfq.deliveryRegion}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {rfq.deadline}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-medium">
                          {rfq.status}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          (rfq.quotesReceivedCount || 0) > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-slate-400'
                        }`}>
                          {rfq.quotesReceivedCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectRfq(rfq.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          {(rfq.quotesReceivedCount || 0) > 0 ? 'Compare Quotes' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: INTERACTIVE SELECT PROJECT PANEL */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-amber-600" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Select Project Panel</h2>
                <div className="text-[11px] text-slate-500">Click a project to filter RFQs</div>
              </div>
            </div>
            <button
              onClick={onOpenNewProject}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
            >
              + Add Project
            </button>
          </div>

          {/* Quick Clear Filter Bar if a project is active */}
          {selectedProjectId && (
            <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-900 text-[11px] font-medium">
                Filtering by <strong>{activeProject?.name}</strong>
              </span>
              <button
                onClick={() => setSelectedProjectId(null)}
                className="text-[11px] font-semibold text-amber-800 hover:underline"
              >
                Reset Filter
              </button>
            </div>
          )}

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No construction projects registered yet. Click <strong>+ Add Project</strong> above to register your first site.
              </div>
            ) : (
              projects.map(proj => {
                const isSelected = selectedProjectId === proj.id;
                const projectRfqCount = rfqs.filter(r => r.projectId === proj.id).length;

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjectId(isSelected ? null : proj.id)}
                    className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {proj.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{proj.location}</span>
                          <span className="font-semibold text-slate-700">({proj.region})</span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                        {proj.status}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {projectRfqCount} RFQ{projectRfqCount !== 1 ? 's' : ''} active
                      </span>
                      {proj.estimatedBudget ? (
                        <span className="font-mono font-medium text-slate-800">
                          Budget: GH₵ {proj.estimatedBudget.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Budget not specified</span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCreateRfq(proj.id);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                        >
                          + Create RFQ for this Site
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
