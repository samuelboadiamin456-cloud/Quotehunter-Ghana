import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { SupplierProfile, Organization, AuditLogItem } from '../../types/index.ts';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Truck, 
  AlertCircle, 
  Check, 
  X, 
  Eye, 
  Activity 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingSuppliers, setPendingSuppliers] = useState<Array<{ profile: SupplierProfile; org: Organization }>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [overviewRes, pendingRes, logsRes] = await Promise.all([
        api.getAdminOverview(),
        api.getPendingSuppliers(),
        api.getAuditLogs(30),
      ]);
      setMetrics(overviewRes.metrics);
      setPendingSuppliers(pendingRes);
      setAuditLogs(logsRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerify = async (profileId: string, status: string) => {
    try {
      setActioningId(profileId);
      await api.verifySupplier(profileId, status, `Manual review executed by platform admin.`);
      await loadAdminData();
    } catch (err: any) {
      alert('Verification update failed: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-heading">
              Platform Operations & Governance
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              Supplier verification, security audit logging, and procurement integrity monitoring.
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
            Administrative Access
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Total Users</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {metrics.totalUsers}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Organizations</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {metrics.totalOrganizations}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Total RFQs</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {metrics.totalRfqs}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Quotations</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {metrics.totalQuotations}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Orders Won</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {metrics.totalOrders}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-medium text-amber-700">Pending Reviews</div>
            <div className="text-xl font-bold text-amber-800 font-mono tabular-nums mt-0.5">
              {metrics.pendingSupplierVerifications}
            </div>
          </div>
        </div>
      )}

      {/* Pending Supplier Verifications */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Supplier Business Verification Queue
            </h2>
            <div className="text-xs text-slate-500">
              Audit business registration, Ghana GRA Tax Identification Number (TIN), and location
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {pendingSuppliers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No suppliers awaiting verification. All active suppliers are verified.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Business / Company Name</th>
                  <th className="py-2.5 px-4">Registration & TIN</th>
                  <th className="py-2.5 px-4">Location & Region</th>
                  <th className="py-2.5 px-4">Current Status</th>
                  <th className="py-2.5 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSuppliers.map(({ profile, org }) => (
                  <tr key={profile.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{org.name}</div>
                      <div className="text-[11px] text-slate-500">{org.email} · {org.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div>Reg: {org.registrationNumber || 'Not submitted'}</div>
                      <div>TIN: {org.tinNumber || 'Not submitted'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{org.address}</div>
                      <div className="text-[11px] text-slate-400">{org.city}, {org.region}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded capitalize">
                        {profile.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => handleVerify(profile.id, 'verified')}
                        disabled={actioningId === profile.id}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                      >
                        Approve & Verify
                      </button>
                      <button
                        onClick={() => handleVerify(profile.id, 'rejected')}
                        disabled={actioningId === profile.id}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Security & Compliance Audit Trail
              </h2>
              <div className="text-xs text-slate-500">
                Immutable chronological log of platform transactions and authentication events
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No audit events recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-medium">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Resource Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} · {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-800">
                      <div className="font-semibold text-xs">{log.actorName || 'System'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.actorEmail || log.actorUserId}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                      {log.resourceType}:{log.resourceId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
