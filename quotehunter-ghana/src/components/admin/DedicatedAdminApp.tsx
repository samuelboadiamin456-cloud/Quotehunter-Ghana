import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { SupplierProfile, Organization, AuditLogItem } from '../../types/index.ts';
import { Building2, ArrowLeft, RefreshCw, Search, X } from 'lucide-react';
import { AdminBillingPanel } from '../billing/AdminBillingPanel.tsx';

interface DedicatedAdminAppProps {
  onReturnToMarketplace: () => void;
}

const MASTER_PASSCODE = 'QH-GHANA-ADMIN-2026';
const AUTHORIZED_SUPER_ADMIN_EMAIL = 'samuelboadiamin456@gmail.com';

type TabId = 'overview' | 'users' | 'suppliers' | 'rfqs' | 'orders' | 'catalog' | 'audits' | 'billing' | 'system';

// "in_transit" -> "In transit", "super_admin" -> "Super admin"
const label = (value?: string | null) => {
  if (!value) return '';
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Regions are stored as a JSON list; show them as plain text
const regionsText = (value?: string | null) => {
  if (!value) return 'Not given';
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
  } catch {
    return value;
  }
};

const TONES: Record<string, string> = {
  green: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-800 bg-amber-50 border-amber-200',
  red: 'text-rose-800 bg-rose-50 border-rose-200',
  blue: 'text-sky-800 bg-sky-50 border-sky-200',
  purple: 'text-indigo-800 bg-indigo-50 border-indigo-200',
  gray: 'text-slate-700 bg-slate-100 border-slate-200',
};

const Badge: React.FC<{ tone: keyof typeof TONES; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-block whitespace-nowrap text-xs font-medium border px-2 py-0.5 rounded ${TONES[tone]}`}>{children}</span>
);

const roleTone = (role: string) =>
  role === 'super_admin' ? 'amber' : role === 'admin' ? 'purple' : role === 'supplier' ? 'blue' : 'gray';
const verifyTone = (s: string) =>
  s === 'verified' ? 'green' : s === 'pending' || s === 'under_review' ? 'amber' : s === 'suspended' || s === 'rejected' ? 'red' : 'gray';
const orderTone = (s: string) =>
  s === 'completed' ? 'green' : s === 'delivered' ? 'blue' : s === 'in_transit' ? 'purple' : s === 'confirmed' ? 'amber' : s === 'cancelled' ? 'red' : 'gray';
const rfqTone = (s: string) =>
  s === 'open' || s === 'reviewing' || s === 'published' ? 'green' : s === 'awarded' || s === 'closed' ? 'blue' : s === 'cancelled' ? 'red' : 'gray';

const card = 'bg-white border border-slate-200 rounded-lg shadow-2xs';
const tableHead = 'bg-slate-50 text-slate-500 border-b border-slate-200 text-xs';
const th = 'py-2.5 px-4 font-medium';
const td = 'py-3 px-4';
const primaryBtn = 'whitespace-nowrap px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-sm rounded-md transition-colors';
const secondaryBtn = 'whitespace-nowrap px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-md border border-slate-300 transition-colors';
const dangerBtn = 'whitespace-nowrap px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-medium text-sm rounded-md border border-rose-200 transition-colors';
const input = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600';
const fieldLabel = 'block text-sm font-medium text-slate-700 mb-1';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
    <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const DedicatedAdminApp: React.FC<DedicatedAdminAppProps> = ({ onReturnToMarketplace }) => {
  const { user, signInWithGoogle, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Access gate
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [accessError, setAccessError] = useState<string | null>(null);

  // Data
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [pendingSuppliers, setPendingSuppliers] = useState<Array<{ profile: SupplierProfile; org: Organization }>>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<{ categories: any[]; materials: any[] }>({ categories: [], materials: [] });
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals
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

  const emptyCatalogForm = { id: '', categoryId: '', name: '', specification: '', unit: '50kg bag', standardPriceGhs: '', description: '' };
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm);

  // Unlock automatically for admin accounts
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
    } else {
      setAccessError('That access key is not correct.');
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [overviewRes, usersRes, orgsRes, pendingRes, rfqsRes, ordersRes, catalogRes, logsRes, diagRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers().catch(() => []),
        api.getAdminOrganizations().catch(() => []),
        api.getPendingSuppliers().catch(() => []),
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
      setRfqs(rfqsRes);
      setOrders(ordersRes);
      setCatalog(catalogRes);
      setAuditLogs(logsRes);
      setDiagnostics(diagRes);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setLoadError('Could not load admin data. Sign in with an admin account and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) loadAdminData();
  }, [isUnlocked]);

  // Actions
  const handleVerifySupplier = async (profileId: string, status: 'verified' | 'rejected' | 'under_review') => {
    try {
      setActioningId(profileId);
      await api.verifySupplier(profileId, status, `Reviewed by ${user?.email || AUTHORIZED_SUPER_ADMIN_EMAIL}`);
      setStatusMessage(`Supplier status updated to ${label(status).toLowerCase()}.`);
      await loadAdminData();
    } catch (err: any) {
      alert('Could not update the supplier: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteOrderOverride = async () => {
    if (!selectedOrderForOverride) return;
    if (overrideReason.trim().length < 5) {
      alert('Please write a short reason (at least 5 characters).');
      return;
    }
    try {
      setActioningId(selectedOrderForOverride.id);
      await api.adminOverrideOrderStatus(selectedOrderForOverride.id, overrideStatus, overrideReason.trim());
      setStatusMessage(`Order ${selectedOrderForOverride.orderNumber} changed to ${label(overrideStatus).toLowerCase()}.`);
      setOverrideModalOpen(false);
      setSelectedOrderForOverride(null);
      setOverrideReason('');
      await loadAdminData();
    } catch (err: any) {
      alert('Could not change the order: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!selectedUserForRole) return;
    try {
      setActioningId(selectedUserForRole.id);
      await api.updateUserRole(selectedUserForRole.id, targetRole);
      setStatusMessage(`${selectedUserForRole.email} is now ${label(targetRole).toLowerCase()}.`);
      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Could not change the role: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleExecuteOrgStatusChange = async () => {
    if (!selectedOrgForStatus) return;
    try {
      setActioningId(selectedOrgForStatus.id);
      await api.updateOrganizationStatus(selectedOrgForStatus.id, targetOrgStatus, orgStatusNotes);
      setStatusMessage(`${selectedOrgForStatus.name} is now ${label(targetOrgStatus).toLowerCase()}.`);
      setOrgModalOpen(false);
      setSelectedOrgForStatus(null);
      setOrgStatusNotes('');
      await loadAdminData();
    } catch (err: any) {
      alert('Could not update the organisation: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleSaveCatalogMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogForm.categoryId || !catalogForm.name || !catalogForm.unit) {
      alert('Please fill in the category, name and unit.');
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
      setStatusMessage(`${catalogForm.name} saved.`);
      setCatalogModalOpen(false);
      setCatalogForm(emptyCatalogForm);
      await loadAdminData();
    } catch (err: any) {
      alert('Could not save the material: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAlignSequences = async () => {
    if (!confirm('Check the number counters against existing records and fix them if needed?')) return;
    try {
      setLoading(true);
      await api.alignAdminSequences();
      setStatusMessage('Number counters checked and updated.');
      await loadAdminData();
    } catch (err: any) {
      alert('Could not check the counters: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // Sign-in / access screen
  // ---------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-2xs p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-bold text-slate-900">QuoteHunter Ghana</span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900 font-heading">Admin sign-in</h1>
            <p className="text-sm text-slate-500 mt-1">
              Sign in with an administrator account to manage users, suppliers, RFQs and orders.
            </p>
          </div>

          {accessError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">{accessError}</div>
          )}

          {!user ? (
            <div className="space-y-2">
              <button onClick={() => signInWithGoogle()} className={`${primaryBtn} w-full`}>
                Sign in with Google
              </button>
              {authError && <div className="text-sm text-rose-700">{authError}</div>}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
              Signed in as <strong className="text-slate-900">{user.email}</strong>. This account does not have admin access yet.
            </div>
          )}

          <form onSubmit={handleUnlockWithPasscode} className="space-y-3 pt-4 border-t border-slate-200">
            <div>
              <label className={fieldLabel}>Access key</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter the access key"
                className={input}
              />
              <p className="text-xs text-slate-500 mt-1">
                The key only opens this screen. Changes still need a signed-in admin account.
              </p>
            </div>
            <button type="submit" className={`${secondaryBtn} w-full`}>
              Open admin
            </button>
          </form>

          <button
            onClick={onReturnToMarketplace}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to QuoteHunter
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------
  const q = searchTerm.toLowerCase();
  const has = (v: any) => String(v ?? '').toLowerCase().includes(q);

  const filteredUsers = usersList.filter((u) => has(u.name) || has(u.email) || has(u.role) || has(u.orgName));
  const filteredOrgs = orgsList.filter((o) => has(o.name) || has(o.type) || has(o.city) || has(o.region));
  const filteredRfqs = rfqs.filter((r) => has(r.requestNumber) || has(r.projectName) || has(r.organizationName) || has(r.status));
  const filteredOrders = orders.filter((o) => has(o.orderNumber) || has(o.buyerOrg?.name) || has(o.supplierOrg?.name) || has(o.status));
  const filteredAudits = auditLogs.filter((l) => has(l.action) || has(l.actorEmail) || has(l.resourceType) || has(l.resourceId));

  const seq = (name: string) => diagnostics?.database?.sequences?.[name]?.last_value ?? '—';

  const tabs: Array<{ id: TabId; name: string; count?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'users', name: 'Users and organisations', count: usersList.length },
    { id: 'suppliers', name: 'Supplier approvals', count: pendingSuppliers.length },
    { id: 'rfqs', name: 'RFQs', count: rfqs.length },
    { id: 'orders', name: 'Orders', count: orders.length },
    { id: 'catalog', name: 'Materials', count: catalog.materials?.length },
    { id: 'audits', name: 'Activity log', count: auditLogs.length },
    { id: 'billing', name: 'Billing' },
    { id: 'system', name: 'System' },
  ];

  const PageHeader: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-heading">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header, same style as the main app */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-bold text-slate-900">QuoteHunter Ghana</span>
            <span className="text-sm font-medium text-slate-500 border-l border-slate-200 pl-2.5 ml-0.5">Admin</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden md:block text-right leading-tight">
              <div className="font-semibold text-slate-900">{user?.name || user?.email || 'Administrator'}</div>
              <div className="text-xs text-slate-500">{label(user?.role) || 'Admin'}</div>
            </div>
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onReturnToMarketplace} className={`${secondaryBtn} flex items-center gap-1.5`}>
              <ArrowLeft className="w-4 h-4" />
              Back to QuoteHunter
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-slate-600">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap shrink-0 py-2.5 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {tab.name}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 text-xs text-slate-500">{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="relative shrink-0 w-44 sm:w-60 hidden sm:block">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search this page"
              className={`${input} pl-8 py-1.5`}
            />
          </div>
        </div>
      </header>

      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2 text-sm text-emerald-800 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2 text-sm text-rose-800">{loadError}</div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ---------------- Overview ---------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PageHeader title="Overview" description="A snapshot of activity on QuoteHunter Ghana." />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'Users', value: metrics?.totalUsers ?? usersList.length },
                { name: 'Organisations', value: metrics?.totalOrganizations ?? orgsList.length },
                { name: 'RFQs', value: metrics?.totalRfqs ?? rfqs.length },
                { name: 'Quotations', value: metrics?.totalQuotations ?? '—' },
                { name: 'Orders', value: metrics?.totalOrders ?? orders.length },
                { name: 'Suppliers awaiting review', value: pendingSuppliers.length },
              ].map((stat) => (
                <div key={stat.name} className={`${card} p-4`}>
                  <div className="text-xs text-slate-500">{stat.name}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Suppliers waiting for approval</h2>
                  <button onClick={() => setActiveTab('suppliers')} className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                    View all
                  </button>
                </div>
                {pendingSuppliers.length === 0 ? (
                  <p className="text-sm text-slate-500">No suppliers are waiting for review.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {pendingSuppliers.slice(0, 5).map(({ profile, org }) => (
                      <li key={profile.id} className="py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium text-slate-900">{org.name}</div>
                          <div className="text-xs text-slate-500">{org.city || 'Ghana'}{org.region ? `, ${org.region}` : ''}</div>
                        </div>
                        <Badge tone={verifyTone(profile.verificationStatus)}>{label(profile.verificationStatus)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
                  <button onClick={() => setActiveTab('audits')} className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                    View all
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing has happened yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {auditLogs.slice(0, 5).map((log) => (
                      <li key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{label(log.action)}</div>
                          <div className="text-xs text-slate-500 truncate">{log.actorEmail || log.actorName || log.actorUserId}</div>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Users and organisations ---------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <PageHeader title="Users and organisations" description="Only a super admin can give or remove admin roles." />

            <div className={`${card} overflow-hidden`}>
              <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                Users ({filteredUsers.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>User</th>
                      <th className={th}>Role</th>
                      <th className={th}>Organisation</th>
                      <th className={th}>Joined</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-400">No users to show.</td></tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={td}>
                          <div className="font-medium text-slate-900">{u.name || 'User'}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className={td}><Badge tone={roleTone(u.role)}>{label(u.role)}</Badge></td>
                        <td className={td}>
                          <div className="text-slate-900">{u.orgName || 'No organisation'}</div>
                          <div className="text-xs text-slate-500 capitalize">{u.orgType || ''}</div>
                        </td>
                        <td className={`${td} text-slate-500`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className={`${td} text-right`}>
                          <button
                            onClick={() => { setSelectedUserForRole(u); setTargetRole(u.role); setRoleModalOpen(true); }}
                            className={secondaryBtn}
                          >
                            Change role
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${card} overflow-hidden`}>
              <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                Organisations ({filteredOrgs.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Organisation</th>
                      <th className={th}>Type</th>
                      <th className={th}>Location</th>
                      <th className={th}>Verification</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredOrgs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-400">No organisations to show.</td></tr>
                    )}
                    {filteredOrgs.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={td}>
                          <div className="font-medium text-slate-900">{org.name}</div>
                          <div className="text-xs text-slate-500">{org.email || 'No email'}</div>
                        </td>
                        <td className={`${td} capitalize`}>{org.type}</td>
                        <td className={td}>{[org.city, org.region].filter(Boolean).join(', ') || 'Not given'}</td>
                        <td className={td}><Badge tone={verifyTone(org.verificationStatus)}>{label(org.verificationStatus)}</Badge></td>
                        <td className={`${td} text-right`}>
                          <button
                            onClick={() => {
                              setSelectedOrgForStatus(org);
                              setTargetOrgStatus(org.verificationStatus);
                              setOrgStatusNotes(org.verificationNotes || '');
                              setOrgModalOpen(true);
                            }}
                            className={secondaryBtn}
                          >
                            Change status
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

        {/* ---------------- Supplier approvals ---------------- */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <PageHeader
              title="Supplier approvals"
              description="Review suppliers before they can send quotations."
            />

            {pendingSuppliers.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <h2 className="text-sm font-semibold text-slate-900">No suppliers are waiting</h2>
                <p className="text-sm text-slate-500 mt-1">New supplier applications will show up here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingSuppliers.map(({ profile, org }) => (
                  <div key={profile.id} className={`${card} p-5 space-y-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{org.name}</div>
                        <div className="text-sm text-slate-500">{org.city || 'Ghana'}{org.region ? `, ${org.region}` : ''}</div>
                      </div>
                      <Badge tone={verifyTone(profile.verificationStatus)}>{label(profile.verificationStatus)}</Badge>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200">
                      {profile.businessDescription || 'No description given.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
                      <div>Years in business: <span className="text-slate-900 font-medium">{profile.yearsInBusiness}</span></div>
                      <div>Regions served: <span className="text-slate-900 font-medium">{regionsText(profile.serviceRegions)}</span></div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'verified')}
                        disabled={actioningId === profile.id}
                        className={primaryBtn}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'under_review')}
                        disabled={actioningId === profile.id}
                        className={secondaryBtn}
                      >
                        Ask for documents
                      </button>
                      <button
                        onClick={() => handleVerifySupplier(profile.id, 'rejected')}
                        disabled={actioningId === profile.id}
                        className={dangerBtn}
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

        {/* ---------------- RFQs ---------------- */}
        {activeTab === 'rfqs' && (
          <div className="space-y-6">
            <PageHeader title="RFQs" description="Material requests posted by contractors." />

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>RFQ</th>
                      <th className={th}>Project and contractor</th>
                      <th className={th}>Items</th>
                      <th className={th}>Quotations</th>
                      <th className={th}>Delivery date</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredRfqs.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-400">No RFQs to show.</td></tr>
                    )}
                    {filteredRfqs.map((rfq) => (
                      <tr key={rfq.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={`${td} font-semibold text-slate-900 whitespace-nowrap`}>{rfq.requestNumber}</td>
                        <td className={td}>
                          <div className="font-medium text-slate-900">{rfq.projectName}</div>
                          <div className="text-xs text-slate-500">{rfq.organizationName}</div>
                        </td>
                        <td className={td}>{rfq.itemsCount}</td>
                        <td className={td}>{rfq.quotesCount}</td>
                        <td className={`${td} text-slate-500`}>
                          {rfq.requiredDeliveryDate ? new Date(rfq.requiredDeliveryDate).toLocaleDateString() : 'Not set'}
                        </td>
                        <td className={td}><Badge tone={rfqTone(rfq.status)}>{label(rfq.status)}</Badge></td>
                        <td className={`${td} text-right`}>
                          <button
                            onClick={async () => {
                              const reason = prompt('Why are you cancelling this RFQ?');
                              if (reason) {
                                try {
                                  await api.updateAdminRfqStatus(rfq.id, 'cancelled', reason);
                                  await loadAdminData();
                                } catch (err: any) {
                                  alert('Could not cancel the RFQ: ' + err.message);
                                }
                              }
                            }}
                            className={dangerBtn}
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

        {/* ---------------- Orders ---------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <PageHeader
              title="Orders"
              description="Buyers and suppliers follow the normal order steps. As an admin you can change a status directly, and every change is logged with your reason."
            />

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Order</th>
                      <th className={th}>Buyer</th>
                      <th className={th}>Supplier</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Delivery</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-400">No orders yet.</td></tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className={`${td} font-semibold text-slate-900 whitespace-nowrap`}>{ord.orderNumber}</td>
                          <td className={td}>
                            <div className="font-medium text-slate-900">{ord.buyerOrg?.name || 'Contractor'}</div>
                            <div className="text-xs text-slate-500">{ord.buyerOrg?.city || ''}</div>
                          </td>
                          <td className={td}>
                            <div className="font-medium text-slate-900">{ord.supplierOrg?.name || 'Supplier'}</div>
                            <div className="text-xs text-slate-500">{ord.supplierOrg?.city || ''}</div>
                          </td>
                          <td className={`${td} font-semibold text-slate-900 tabular-nums whitespace-nowrap`}>
                            GH₵ {Number(ord.totalAmountGhs || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`${td} text-slate-500`}>
                            {ord.actualDeliveryDate
                              ? `Delivered ${new Date(ord.actualDeliveryDate).toLocaleDateString()}`
                              : ord.scheduledDeliveryDate
                              ? `Scheduled ${new Date(ord.scheduledDeliveryDate).toLocaleDateString()}`
                              : 'Not scheduled'}
                          </td>
                          <td className={td}><Badge tone={orderTone(ord.status)}>{label(ord.status)}</Badge></td>
                          <td className={`${td} text-right`}>
                            <button
                              onClick={() => { setSelectedOrderForOverride(ord); setOverrideStatus(ord.status); setOverrideModalOpen(true); }}
                              className={secondaryBtn}
                            >
                              Change status
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

        {/* ---------------- Materials ---------------- */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <PageHeader
              title="Materials"
              description="The standard materials contractors can pick from, with units and reference prices in Ghana cedis."
              action={
                <button
                  onClick={() => {
                    setCatalogForm({ ...emptyCatalogForm, categoryId: catalog.categories[0]?.id || '' });
                    setCatalogModalOpen(true);
                  }}
                  className={primaryBtn}
                >
                  Add material
                </button>
              }
            />

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Material</th>
                      <th className={th}>Specification</th>
                      <th className={th}>Unit</th>
                      <th className={th}>Reference price</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {catalog.materials.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sm text-slate-400">
                          No materials yet. Use "Add material" to create the first one.
                        </td>
                      </tr>
                    )}
                    {catalog.materials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={`${td} font-medium text-slate-900`}>{mat.name}</td>
                        <td className={`${td} text-slate-500`}>{mat.specification || 'Not given'}</td>
                        <td className={td}>{mat.unit}</td>
                        <td className={`${td} font-semibold text-slate-900 tabular-nums`}>
                          {mat.standardPriceGhs ? `GH₵ ${Number(mat.standardPriceGhs).toFixed(2)}` : 'Market rate'}
                        </td>
                        <td className={`${td} text-right`}>
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
                            className={secondaryBtn}
                          >
                            Edit
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

        {/* ---------------- Activity log ---------------- */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <PageHeader
              title="Activity log"
              description="A record of important actions, such as status changes, supplier reviews and role changes."
            />

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>When</th>
                      <th className={th}>Action</th>
                      <th className={th}>Done by</th>
                      <th className={th}>Item</th>
                      <th className={th}>Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredAudits.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-400">No activity to show.</td></tr>
                    )}
                    {filteredAudits.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={`${td} text-slate-500 whitespace-nowrap`}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td className={td}>
                          <Badge tone={log.action === 'ORDER_STATUS_OVERRIDE' ? 'red' : log.action.includes('VERIF') ? 'green' : 'gray'}>
                            {label(log.action)}
                          </Badge>
                        </td>
                        <td className={td}>{log.actorEmail || log.actorName || log.actorUserId}</td>
                        <td className={`${td} text-slate-500`}>
                          {log.resourceType ? `${label(log.resourceType)} ${log.resourceId?.slice(0, 8) ?? ''}` : '—'}
                        </td>
                        <td className={`${td} text-slate-500 max-w-xs truncate`}>
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

        {/* ---------------- Billing ---------------- */}
        {activeTab === 'billing' && <AdminBillingPanel />}

        {/* ---------------- System ---------------- */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <PageHeader
              title="System"
              description="Counters used to number RFQs, quotations and orders."
              action={
                <button onClick={handleAlignSequences} className={secondaryBtn}>
                  Check counters
                </button>
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'RFQ counter', key: 'rfq_number_seq' },
                { name: 'Quotation counter', key: 'quote_number_seq' },
                { name: 'Order counter', key: 'order_number_seq' },
              ].map((c) => (
                <div key={c.key} className={`${card} p-5`}>
                  <div className="text-sm text-slate-500">{c.name}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{seq(c.key)}</div>
                  <div className="text-xs text-slate-500 mt-1">Last number issued</div>
                </div>
              ))}
            </div>

            <details className={`${card} p-5`}>
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer">Technical details</summary>
              <pre className="mt-3 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </main>

      {/* ---------------- Modals ---------------- */}
      {overrideModalOpen && selectedOrderForOverride && (
        <Modal title="Change order status" onClose={() => setOverrideModalOpen(false)}>
          <p className="text-sm text-slate-700">
            Order <strong className="text-slate-900">{selectedOrderForOverride.orderNumber}</strong> is currently{' '}
            <strong className="text-slate-900">{label(selectedOrderForOverride.status).toLowerCase()}</strong>.
          </p>
          <div>
            <label className={fieldLabel}>New status</label>
            <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className={input}>
              {['placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Reason (required, saved in the activity log)</label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="For example: contractor confirmed they received the delivery"
              className={input}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onClick={() => setOverrideModalOpen(false)} className={secondaryBtn}>Cancel</button>
            <button onClick={handleExecuteOrderOverride} disabled={actioningId === selectedOrderForOverride.id} className={primaryBtn}>
              Save change
            </button>
          </div>
        </Modal>
      )}

      {roleModalOpen && selectedUserForRole && (
        <Modal title="Change role" onClose={() => setRoleModalOpen(false)}>
          <p className="text-sm text-slate-700">
            Choose a role for <strong className="text-slate-900">{selectedUserForRole.email}</strong>.
          </p>
          <div>
            <label className={fieldLabel}>Role</label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className={input}>
              {['contractor', 'supplier', 'admin', 'super_admin'].map((r) => (
                <option key={r} value={r}>{label(r)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onClick={() => setRoleModalOpen(false)} className={secondaryBtn}>Cancel</button>
            <button onClick={handleExecuteRoleChange} disabled={actioningId === selectedUserForRole.id} className={primaryBtn}>
              Save role
            </button>
          </div>
        </Modal>
      )}

      {orgModalOpen && selectedOrgForStatus && (
        <Modal title="Change verification status" onClose={() => setOrgModalOpen(false)}>
          <p className="text-sm text-slate-700">
            Update <strong className="text-slate-900">{selectedOrgForStatus.name}</strong>.
          </p>
          <div>
            <label className={fieldLabel}>Status</label>
            <select value={targetOrgStatus} onChange={(e) => setTargetOrgStatus(e.target.value)} className={input}>
              {['verified', 'pending', 'under_review', 'rejected', 'suspended'].map((s) => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Notes</label>
            <input
              type="text"
              value={orgStatusNotes}
              onChange={(e) => setOrgStatusNotes(e.target.value)}
              placeholder="For example: registration documents checked"
              className={input}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onClick={() => setOrgModalOpen(false)} className={secondaryBtn}>Cancel</button>
            <button onClick={handleExecuteOrgStatusChange} disabled={actioningId === selectedOrgForStatus.id} className={primaryBtn}>
              Save status
            </button>
          </div>
        </Modal>
      )}

      {catalogModalOpen && (
        <Modal title={catalogForm.id ? 'Edit material' : 'Add material'} onClose={() => setCatalogModalOpen(false)}>
          <form onSubmit={handleSaveCatalogMaterial} className="space-y-3">
            <div>
              <label className={fieldLabel}>Category</label>
              <select
                value={catalogForm.categoryId}
                onChange={(e) => setCatalogForm({ ...catalogForm, categoryId: e.target.value })}
                className={input}
                required
              >
                <option value="">Select a category</option>
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Name</label>
              <input
                type="text"
                value={catalogForm.name}
                onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                placeholder="For example: Ghacem Portland Cement 42.5R"
                className={input}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Unit</label>
                <input
                  type="text"
                  value={catalogForm.unit}
                  onChange={(e) => setCatalogForm({ ...catalogForm, unit: e.target.value })}
                  placeholder="50kg bag, tonne, trip"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Reference price (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  value={catalogForm.standardPriceGhs}
                  onChange={(e) => setCatalogForm({ ...catalogForm, standardPriceGhs: e.target.value })}
                  placeholder="105.00"
                  className={input}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Specification</label>
              <input
                type="text"
                value={catalogForm.specification}
                onChange={(e) => setCatalogForm({ ...catalogForm, specification: e.target.value })}
                placeholder="For example: BS EN 197-1 CEM I 42.5R"
                className={input}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setCatalogModalOpen(false)} className={secondaryBtn}>Cancel</button>
              <button type="submit" disabled={loading} className={primaryBtn}>Save material</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
