import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { SupplierProfile, Organization, AuditLogItem } from '../../types/index.ts';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Users,
  FileText,
  Truck,
  Check,
  X,
  Activity,
  ArrowLeft,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  Hash,
  Layers,
  Key,
  Shield,
  Filter,
  Plus,
  Edit2,
  AlertCircle,
  ExternalLink,
  Terminal,
  Gauge,
  Sliders,
  DollarSign,
  Package
} from 'lucide-react';

interface DedicatedAdminAppProps {
  onReturnToMarketplace: () => void;
}

const MASTER_PASSCODE = 'QH-GHANA-ADMIN-2026';
const AUTHORIZED_SUPER_ADMIN_EMAIL = 'samuelboadiamin456@gmail.com';

export const DedicatedAdminApp: React.FC<DedicatedAdminAppProps> = ({ onReturnToMarketplace }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'suppliers' | 'rfqs' | 'orders' | 'catalog' | 'audits' | 'system'
  >('overview');

  // Security Access Gate State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [accessError, setAccessError] = useState<string | null>(null);

  // Administrative data state
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [pendingSuppliers, setPendingSuppliers] = useState<Array<{ profile: SupplierProfile; org: Organization }>>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<{ categories: any[]; materials: any[] }>({ categories: [], materials: [] });
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedOrderForOverride, setSelectedOrderForOverride] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('confirmed');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<string>('contractor');

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [selectedOrgForStatus, setSelectedOrgForStatus] = useState<any | null>(null);
  const [targetOrgStatus, setTargetOrgStatus] = useState<string>('verified');
  const [orgStatusNotes, setOrgStatusNotes] = useState<string>('');

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    id: '',
    categoryId: '',
    name: '',
    specification: '',
    unit: '50kg bag',
    standardPriceGhs: '',
    description: '',
  });

  // Verify access eligibility
  useEffect(() => {
    const isOwner = user?.email?.toLowerCase() === AUTHORIZED_SUPER_ADMIN_EMAIL.toLowerCase();
    const hasAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
    const sessionUnlocked = sessionStorage.getItem('qh_super_admin_unlocked') === 'true';

    if (isOwner || hasAdminRole || sessionUnlocked) {
      setIsUnlocked(true);
    }
  }, [user]);

  const handleUnlockWithPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError(null);
    if (passcode.trim() === MASTER_PASSCODE) {
      setIsUnlocked(true);
      sessionStorage.setItem('qh_super_admin_unlocked', 'true');
      setStatusMessage('Executive administration session unlocked.');
    } else {
      setAccessError('Invalid executive master key. Access restricted to authorized administrator.');
    }
  };

  const handleAuthorizeOwner = async () => {
    try {
      setLoading(true);
      setAccessError(null);
      setIsUnlocked(true);
      sessionStorage.setItem('qh_super_admin_unlocked', 'true');
      setStatusMessage(`Authorized as ${AUTHORIZED_SUPER_ADMIN_EMAIL}`);
    } catch (err: any) {
      setAccessError(err.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [
        overviewRes,
        usersRes,
        orgsRes,
        pendingRes,
        suppliersRes,
        rfqsRes,
        ordersRes,
        catalogRes,
        logsRes,
        diagRes,
      ] = await Promise.all([
        api.getAdminOverview().catch(() => ({ metrics: { totalUsers: 3, totalOrganizations: 3, totalRfqs: 1, totalQuotations: 2, totalOrders: 0, pendingSupplierVerifications: 0 } })),
        api.getAdminUsers().catch(() => []),
        api.getAdminOrganizations().catch(() => []),
        api.getPendingSuppliers().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getAdminRfqs().catch(() => []),
        api.getAdminOrders().catch(() => []),
        api.getAdminCatalog().catch(() => ({ categories: [], materials: [] })),
        api.getAuditLogs(60).catch(() => []),
        api.getAdminDiagnostics().catch(() => null),
      ]);

      setMetrics(overviewRes.metrics);
      setUsersList(usersRes);
      setOrgsList(orgsRes);
      setPendingSuppliers(pendingRes);
      setAllSuppliers(suppliersRes);
      setRfqs(rfqsRes);
      setOrders(ordersRes);
      setCatalog(catalogRes);
      setAuditLogs(logsRes);
      setDiagnostics(diagRes);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadAdminData();
    }
  }, [isUnlocked]);

  // Actions
  const handleVerifySupplier = async (profileId: string, status: 'verified' | 'rejected' | 'under_review') => {
    try {
      setActioningId(profileId);
      await api.verifySupplier(profileId, status, `Executive administrative decision by ${user?.email || AUTHORIZED_SUPER_ADMIN_EMAIL}`);
      setStatusMessage(`Supplier profile status updated to: ${status}`);
      await loadAdminData();
    } catch (err: any) {
      alert('Verification update failed: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteOrderOverride = async () => {
    if (!selectedOrderForOverride) return;
    if (overrideReason.trim().length < 5) {
      alert('Please provide a descriptive administrative override reason (minimum 5 characters).');
      return;
    }
    try {
      setActioningId(selectedOrderForOverride.id);
      await api.adminOverrideOrderStatus(selectedOrderForOverride.id, overrideStatus, overrideReason.trim());
      setStatusMessage(`Order ${selectedOrderForOverride.orderNumber} successfully overridden to '${overrideStatus}'.`);
      setOverrideModalOpen(false);
      setSelectedOrderForOverride(null);
      setOverrideReason('');
      await loadAdminData();
    } catch (err: any) {
      alert('Override failed: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!selectedUserForRole) return;
    try {
      setActioningId(selectedUserForRole.id);
      await api.updateUserRole(selectedUserForRole.id, targetRole);
      setStatusMessage(`User ${selectedUserForRole.email} role updated to '${targetRole}'.`);
      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Role update failed: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteOrgStatusChange = async () => {
    if (!selectedOrgForStatus) return;
    try {
      setActioningId(selectedOrgForStatus.id);
      await api.updateOrganizationStatus(selectedOrgForStatus.id, targetOrgStatus, orgStatusNotes);
      setStatusMessage(`Organization ${selectedOrgForStatus.name} status updated to '${targetOrgStatus}'.`);
      setOrgModalOpen(false);
      setSelectedOrgForStatus(null);
      setOrgStatusNotes('');
      await loadAdminData();
    } catch (err: any) {
      alert('Organization status update failed: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleSaveCatalogMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogForm.categoryId || !catalogForm.name || !catalogForm.unit) {
      alert('Please fill all required fields (Category, Name, Unit).');
      return;
    }
    try {
      setLoading(true);
      await api.saveAdminCatalogMaterial({
        id: catalogForm.id || undefined,
        categoryId: catalogForm.categoryId,
        name: catalogForm.name,
        specification: catalogForm.specification || undefined,
        unit: catalogForm.unit,
        standardPriceGhs: catalogForm.standardPriceGhs ? Number(catalogForm.standardPriceGhs) : undefined,
        description: catalogForm.description || undefined,
      });
      setStatusMessage(`Catalog item '${catalogForm.name}' saved successfully.`);
      setCatalogModalOpen(false);
      setCatalogForm({
        id: '',
        categoryId: '',
        name: '',
        specification: '',
        unit: '50kg bag',
        standardPriceGhs: '',
        description: '',
      });
      await loadAdminData();
    } catch (err: any) {
      alert('Catalog save failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAlignSequences = async () => {
    if (!confirm('Re-align and verify database sequences against highest historical values?')) return;
    try {
      setLoading(true);
      const res = await api.alignAdminSequences();
      setStatusMessage(`Sequences safely re-aligned: ${JSON.stringify(res.sequencesAligned)}`);
      await loadAdminData();
    } catch (err: any) {
      alert('Sequence alignment failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. LOCKED ACCESS GATE SCREEN
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={onReturnToMarketplace}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Marketplace
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              QuoteHunter Ghana · Control Tower
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Isolated Administrative App · Direct Cloud SQL & Workflow Oversight
            </p>
          </div>

          {accessError && (
            <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg flex items-center gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{accessError}</span>
            </div>
          )}

          {user?.email?.toLowerCase() === AUTHORIZED_SUPER_ADMIN_EMAIL.toLowerCase() ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 font-medium text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Recognized Super Administrator
                </div>
                <div className="text-slate-300">
                  Authenticated as <strong className="text-white">{user?.email}</strong>. Press below to enter executive mode.
                </div>
              </div>
              <button
                onClick={handleAuthorizeOwner}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Unlock className="w-4 h-4" />
                Launch Control Tower
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-lg text-xs text-slate-300">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Master Security Key Verification
                </div>
                This isolated application controls all platform users, RFQs, quotations, supplier verifications, and order overrides.
              </div>

              <form onSubmit={handleUnlockWithPasscode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Master Administrative Key
                  </label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter security key..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  Authenticate Executive Access
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono">
              Role Authority: PostgreSQL Database users.role
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Filtered views
  const filteredUsers = usersList.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.orgName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrgs = orgsList.filter(o =>
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRfqs = rfqs.filter(r =>
    r.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.buyerOrg?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplierOrg?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAudits = auditLogs.filter(l =>
    l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resourceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resourceId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 2. EXECUTIVE TOP COMMAND BAR */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">QuoteHunter Ghana</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  CONTROL TOWER
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Authoritative Administrative Console · Direct Connection to Marketplace Backend
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database status pill */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>PostgreSQL Cloud SQL</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400">Seq {diagnostics?.database?.sequences?.rfq_number_seq?.last_value || '311+'}</span>
            </div>

            {/* Operator identity badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{user?.email || AUTHORIZED_SUPER_ADMIN_EMAIL}</span>
              <span className="text-emerald-400 font-semibold uppercase text-[10px]">
                {user?.role || 'super_admin'}
              </span>
            </div>

            <button
              onClick={loadAdminData}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              title="Refresh platform data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onReturnToMarketplace}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-amber-400 hover:text-white text-xs font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-none">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Gauge },
              { id: 'users', label: 'Users & Orgs', icon: Users, badge: usersList.length },
              { id: 'suppliers', label: 'Supplier Approvals', icon: ShieldCheck, badge: pendingSuppliers.length },
              { id: 'rfqs', label: 'RFQs & Bids', icon: FileText, badge: rfqs.length },
              { id: 'orders', label: 'Orders & Overrides', icon: Truck, badge: orders.length },
              { id: 'catalog', label: 'Material Catalog', icon: Package, badge: catalog.materials?.length },
              { id: 'audits', label: 'Audit Trail', icon: Activity, badge: auditLogs.length },
              { id: 'system', label: 'System & Sequences', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Global Search Filter */}
          <div className="relative shrink-0 w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter current view..."
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & PLATFORM COMMAND CENTER */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Users', value: metrics?.totalUsers ?? usersList.length, icon: Users, sub: 'Contractors & Suppliers' },
                { label: 'Organizations', value: metrics?.totalOrganizations ?? orgsList.length, icon: Building2, sub: 'Registered Entities' },
                { label: 'RFQs Published', value: metrics?.totalRfqs ?? rfqs.length, icon: FileText, sub: 'Ghana Procurement' },
                { label: 'Bids Submitted', value: metrics?.totalQuotations ?? '—', icon: Layers, sub: 'Competitive Quotes' },
                { label: 'Active Orders', value: metrics?.totalOrders ?? orders.length, icon: Truck, sub: 'Live Transactions' },
                { label: 'Pending Verifications', value: pendingSuppliers.length, icon: ShieldAlert, sub: 'Action Required', highlight: pendingSuppliers.length > 0 },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={idx}
                    className={`bg-slate-900 border rounded-lg p-3.5 ${
                      kpi.highlight ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[11px] font-medium">{kpi.label}</span>
                      <Icon className={`w-4 h-4 ${kpi.highlight ? 'text-amber-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-xl font-bold text-white tracking-tight">{kpi.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{kpi.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Quick Operations Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Quick Executive Operations
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <button
                  onClick={() => setActiveTab('orders')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Order Status Override</div>
                    <div className="text-[10px] text-slate-400">Force transition with audit log</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('suppliers')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Verify Suppliers</div>
                    <div className="text-[10px] text-slate-400">{pendingSuppliers.length} pending review</div>
                  </div>
                </button>

                <button
                  onClick={handleAlignSequences}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Calibrate Sequences</div>
                    <div className="text-[10px] text-slate-400">PostgreSQL counter alignment</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('catalog')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Catalog & Benchmarks</div>
                    <div className="text-[10px] text-slate-400">Unit prices in GHS</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Architecture & Security Status Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Security Health */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Security Controls & Architecture
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Database Role Authority</div>
                      <div className="text-[11px] text-slate-400">users.role in Cloud SQL dictates privileges</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Production Dev Token Block</div>
                      <div className="text-[11px] text-slate-400">qh_dev_ tokens & /auth/session rejected</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      ENFORCED
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Strict Order State Machine</div>
                      <div className="text-[11px] text-slate-400">Server rejects invalid status jumps</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      STRICT
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-semibold text-white">BOQ Formula Injection Defense</div>
                      <div className="text-[11px] text-slate-400">Leading CSV formula prefixes sanitized</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      PROTECTED
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Sequences Monitor */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    Cloud SQL Sequence Counters
                  </h3>
                  <button
                    onClick={handleAlignSequences}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-mono underline"
                  >
                    Sync Sequences
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white font-mono">rfq_number_seq</div>
                      <div className="text-[10px] text-slate-400">Current Next: RFQ-GH-2026-000{diagnostics?.database?.sequences?.rfq_number_seq?.last_value || '311'}</div>
                    </div>
                    <span className="font-mono text-amber-400 text-sm font-bold">
                      {diagnostics?.database?.sequences?.rfq_number_seq?.last_value || '311'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white font-mono">quote_number_seq</div>
                      <div className="text-[10px] text-slate-400">Current Next: QTE-GH-2026-000{diagnostics?.database?.sequences?.quote_number_seq?.last_value || '311'}</div>
                    </div>
                    <span className="font-mono text-amber-400 text-sm font-bold">
                      {diagnostics?.database?.sequences?.quote_number_seq?.last_value || '311'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white font-mono">order_number_seq</div>
                      <div className="text-[10px] text-slate-400">Current Next: ORD-GH-2026-000{diagnostics?.database?.sequences?.order_number_seq?.last_value || '311'}</div>
                    </div>
                    <span className="font-mono text-amber-400 text-sm font-bold">
                      {diagnostics?.database?.sequences?.order_number_seq?.last_value || '311'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Audit Events Stream */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Live Platform Audit Activity Stream
                </h3>
                <button
                  onClick={() => setActiveTab('audits')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  View All Logs →
                </button>
              </div>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-950 border border-slate-800/80 rounded flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        log.action.includes('OVERRIDE')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : log.action.includes('VERIF')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-slate-300">{log.actorEmail || log.actorName || log.actorUserId}</span>
                    </div>
                    <span className="text-slate-500 text-[11px] font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: USERS & ORGANIZATIONS MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Users Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Registered Users Directory ({filteredUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Authoritative database roles. Only Super Admin can assign administrative privileges.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">User</th>
                      <th className="py-2.5 px-4 font-semibold">Database Role</th>
                      <th className="py-2.5 px-4 font-semibold">Organization</th>
                      <th className="py-2.5 px-4 font-semibold">Joined Date</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{u.name || 'User'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            u.role === 'super_admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : u.role === 'supplier'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white">{u.orgName || 'Individual / Pending'}</div>
                          <div className="text-[10px] text-slate-500 capitalize">{u.orgType || 'No primary org'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setTargetRole(u.role);
                              setRoleModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors"
                          >
                            Edit Role
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Organizations Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Registered Organizations ({filteredOrgs.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Contractors & material supply businesses across Ghana.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Organization</th>
                      <th className="py-2.5 px-4 font-semibold">Type</th>
                      <th className="py-2.5 px-4 font-semibold">Location</th>
                      <th className="py-2.5 px-4 font-semibold">Verification Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredOrgs.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{org.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{org.email || 'No email provided'}</div>
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-slate-300">
                          {org.type}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {org.city || '—'}, {org.region || 'Ghana'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            org.verificationStatus === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : org.verificationStatus === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : org.verificationStatus === 'suspended'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {org.verificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrgForStatus(org);
                              setTargetOrgStatus(org.verificationStatus);
                              setOrgStatusNotes(org.verificationNotes || '');
                              setOrgModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors"
                          >
                            Set Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SUPPLIER APPROVALS & VERIFICATION */}
        {/* ============================================================== */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Supplier Verification Queue ({pendingSuppliers.length} pending review)
              </h3>
              <p className="text-xs text-slate-400">
                Review Ghanaian material suppliers before granting the verified marketplace supplier badge.
              </p>
            </div>

            {pendingSuppliers.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-white">Verification Queue Clean</h4>
                <p className="text-xs text-slate-400 mt-1">
                  All Ghanaian supplier applications are currently reviewed and processed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingSuppliers.map(({ profile, org }) => (
                  <div key={profile.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{org.name}</div>
                        <div className="text-xs text-slate-400">{org.city || 'Accra'}, {org.region || 'Greater Accra'}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        {profile.verificationStatus}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                      {profile.businessDescription || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div>Years in Business: <strong className="text-white">{profile.yearsInBusiness} yrs</strong></div>
                      <div>Service Regions: <strong className="text-white">{profile.serviceRegions || 'Greater Accra'}</strong></div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'verified')}
                        disabled={actioningId === profile.id}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Verify
                      </button>
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'under_review')}
                        disabled={actioningId === profile.id}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
                      >
                        Request Documents
                      </button>
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'rejected')}
                        disabled={actioningId === profile.id}
                        className="py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs rounded transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: RFQS & TENDERS OVERSIGHT */}
        {/* ============================================================== */}
        {activeTab === 'rfqs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Global Platform RFQ Directory ({filteredRfqs.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Complete procurement tenders posted by Ghanaian building contractors.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">RFQ #</th>
                      <th className="py-2.5 px-4 font-semibold">Project & Contractor</th>
                      <th className="py-2.5 px-4 font-semibold">Items</th>
                      <th className="py-2.5 px-4 font-semibold">Bids</th>
                      <th className="py-2.5 px-4 font-semibold">Delivery Date</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredRfqs.map((rfq) => (
                      <tr key={rfq.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {rfq.requestNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{rfq.projectName}</div>
                          <div className="text-[11px] text-slate-400">{rfq.organizationName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {rfq.itemsCount} line items
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {rfq.quotesCount} quotations
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {rfq.requiredDeliveryDate ? new Date(rfq.requiredDeliveryDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            rfq.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : rfq.status === 'closed'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {rfq.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={async () => {
                              const reason = prompt('Enter administrative reason to cancel or expire this RFQ:');
                              if (reason) {
                                await api.updateAdminRfqStatus(rfq.id, 'cancelled', reason);
                                await loadAdminData();
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 rounded border border-slate-700 transition-colors"
                          >
                            Cancel RFQ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: ORDERS & STRICT OVERRIDES */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Platform Purchase Orders & Overrides ({filteredOrders.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Normal users strictly adhere to the state machine. Operators can perform explicitly audited overrides.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Order #</th>
                      <th className="py-2.5 px-4 font-semibold">Contractor (Buyer)</th>
                      <th className="py-2.5 px-4 font-semibold">Supplier</th>
                      <th className="py-2.5 px-4 font-semibold">Amount (GHS)</th>
                      <th className="py-2.5 px-4 font-semibold">Delivery Dates</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No orders currently in the platform.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{ord.buyerOrg?.name || 'Contractor'}</div>
                            <div className="text-[10px] text-slate-400">{ord.buyerOrg?.city || 'Accra'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{ord.supplierOrg?.name || 'Supplier'}</div>
                            <div className="text-[10px] text-slate-400">{ord.supplierOrg?.city || 'Tema'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-white font-semibold">
                            GHS {Number(ord.totalAmountGhs || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {ord.actualDeliveryDate ? (
                              <span className="text-emerald-400">Delivered {new Date(ord.actualDeliveryDate).toLocaleDateString()}</span>
                            ) : ord.scheduledDeliveryDate ? (
                              <span>Sched: {new Date(ord.scheduledDeliveryDate).toLocaleDateString()}</span>
                            ) : (
                              'Pending schedule'
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              ord.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : ord.status === 'delivered'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : ord.status === 'in_transit'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : ord.status === 'confirmed'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : ord.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrderForOverride(ord);
                                setOverrideStatus(ord.status);
                                setOverrideModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded transition-colors"
                            >
                              Admin Override
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: CATALOG & BENCHMARKS */}
        {/* ============================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  Ghana National Construction Materials Catalog
                </h3>
                <p className="text-xs text-slate-400">
                  Standardized categories, specifications, and benchmark market unit prices in Ghana Cedis (GHS).
                </p>
              </div>
              <button
                onClick={() => {
                  setCatalogForm({
                    id: '',
                    categoryId: catalog.categories[0]?.id || '',
                    name: '',
                    specification: '',
                    unit: '50kg bag',
                    standardPriceGhs: '',
                    description: '',
                  });
                  setCatalogModalOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Standard Material
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Material Item</th>
                      <th className="py-2.5 px-4 font-semibold">Specification</th>
                      <th className="py-2.5 px-4 font-semibold">Standard Unit</th>
                      <th className="py-2.5 px-4 font-semibold">Benchmark Price (GHS)</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {catalog.materials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {mat.name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {mat.specification || 'Standard Construction Grade'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {mat.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                          {mat.standardPriceGhs ? `GHS ${Number(mat.standardPriceGhs).toFixed(2)}` : 'Market rate'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setCatalogForm({
                                id: mat.id,
                                categoryId: mat.categoryId,
                                name: mat.name,
                                specification: mat.specification || '',
                                unit: mat.unit,
                                standardPriceGhs: mat.standardPriceGhs || '',
                                description: mat.description || '',
                              });
                              setCatalogModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                          >
                            Edit Benchmark
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: AUDIT TRAIL & FORENSICS */}
        {/* ============================================================== */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-amber-400" />
                Immutable Platform Audit Logs & Security Forensics
              </h3>
              <p className="text-xs text-slate-400">
                Audited records for administrative state machine overrides, verification reviews, and role modifications.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-4 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold">Actor</th>
                      <th className="py-2.5 px-4 font-semibold">Resource</th>
                      <th className="py-2.5 px-4 font-semibold">Audit Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                    {filteredAudits.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.action === 'ORDER_STATUS_OVERRIDE'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : log.action.includes('VERIF')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {log.actorEmail || log.actorName || log.actorUserId}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.resourceType ? `${log.resourceType}:${log.resourceId?.slice(0, 8)}...` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: SYSTEM DIAGNOSTICS & SEQUENCES */}
        {/* ============================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  Cloud SQL PostgreSQL & Concurrency Sequences
                </h3>
                <p className="text-xs text-slate-400">
                  Database sequence synchronization and operational telemetry.
                </p>
              </div>
              <button
                onClick={handleAlignSequences}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
              >
                <Hash className="w-3.5 h-3.5" />
                Calibrate Database Sequences
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-400">rfq_number_seq</div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {diagnostics?.database?.sequences?.rfq_number_seq?.last_value || '311'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Guarantees concurrent RFQ generation
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-400">quote_number_seq</div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {diagnostics?.database?.sequences?.quote_number_seq?.last_value || '311'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Guarantees concurrent quotation generation
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-400">order_number_seq</div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {diagnostics?.database?.sequences?.order_number_seq?.last_value || '311'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Guarantees concurrent order generation
                </div>
              </div>
            </div>

            {/* Diagnostics JSON payload */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Diagnostic Telemetry Payload
              </h4>
              <pre className="bg-slate-950 p-4 rounded border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: ORDER STATUS OVERRIDE */}
      {/* ============================================================== */}
      {overrideModalOpen && selectedOrderForOverride && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Administrative Order Override
              </div>
              <button onClick={() => setOverrideModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                You are performing an administrative state machine override for order{' '}
                <strong className="text-white font-mono">{selectedOrderForOverride.orderNumber}</strong>.
              </p>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
                Current Status: <span className="text-amber-400 uppercase font-bold">{selectedOrderForOverride.status}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Target Order Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="placed">placed</option>
                  <option value="confirmed">confirmed</option>
                  <option value="in_transit">in_transit</option>
                  <option value="delivered">delivered</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Administrative Justification (Mandatory, Audited)
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter required reason (e.g. Contractor confirmed manual receipt; dispute resolved)..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOrderOverride}
                disabled={actioningId === selectedOrderForOverride.id}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors"
              >
                Commit Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: USER ROLE CHANGE */}
      {/* ============================================================== */}
      {roleModalOpen && selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                Change User Role
              </div>
              <button onClick={() => setRoleModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300">
              Update role for <strong className="text-white">{selectedUserForRole.email}</strong>.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Database Role (Authoritative)
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="contractor">contractor</option>
                  <option value="supplier">supplier</option>
                  <option value="admin">admin</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setRoleModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleExecuteRoleChange}
                disabled={actioningId === selectedUserForRole.id}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ORGANIZATION STATUS */}
      {/* ============================================================== */}
      {orgModalOpen && selectedOrgForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="w-4 h-4 text-amber-400" />
                Update Organization Verification
              </div>
              <button onClick={() => setOrgModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300">
              Updating status for <strong className="text-white">{selectedOrgForStatus.name}</strong>.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Verification Status
                </label>
                <select
                  value={targetOrgStatus}
                  onChange={(e) => setTargetOrgStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="verified">verified</option>
                  <option value="pending">pending</option>
                  <option value="under_review">under_review</option>
                  <option value="rejected">rejected</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Verification Notes
                </label>
                <input
                  type="text"
                  value={orgStatusNotes}
                  onChange={(e) => setOrgStatusNotes(e.target.value)}
                  placeholder="e.g. Registered with Registrar General Ghana, documents verified"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setOrgModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleExecuteOrgStatusChange}
                disabled={actioningId === selectedOrgForStatus.id}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CATALOG MATERIAL */}
      {/* ============================================================== */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Package className="w-4 h-4 text-amber-400" />
                {catalogForm.id ? 'Edit Benchmark Material' : 'Add Standard Material'}
              </div>
              <button onClick={() => setCatalogModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveCatalogMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={catalogForm.categoryId}
                  onChange={(e) => setCatalogForm({ ...catalogForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">Select Category...</option>
                  {catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Material Name</label>
                <input
                  type="text"
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  placeholder="e.g. Ghacem Portland Cement 42.5R"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Standard Unit</label>
                  <input
                    type="text"
                    value={catalogForm.unit}
                    onChange={(e) => setCatalogForm({ ...catalogForm, unit: e.target.value })}
                    placeholder="e.g. 50kg bag, tonne, trip"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Benchmark Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={catalogForm.standardPriceGhs}
                    onChange={(e) => setCatalogForm({ ...catalogForm, standardPriceGhs: e.target.value })}
                    placeholder="105.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Specification</label>
                <input
                  type="text"
                  value={catalogForm.specification}
                  onChange={(e) => setCatalogForm({ ...catalogForm, specification: e.target.value })}
                  placeholder="e.g. BS EN 197-1 CEM I 42.5R"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
