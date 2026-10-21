import React from 'react';
import { ArrowLeft, Shield, Lock, Database, Trash2, Download, Printer, Scale } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
  onNavigateToTerms?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  onBack,
  onNavigateToTerms,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              title="Print legal copy"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print / Save PDF
            </button>
            {onNavigateToTerms && (
              <button
                onClick={onNavigateToTerms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition-colors"
              >
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                View Terms of Service
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start sm:items-center gap-3 pt-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Ghana Data Protection Commission
              </span>
              <span className="text-xs text-slate-500">
                Act 843 Registered Data Controller
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Privacy &amp; Data Governance Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Compliant with Ghana Data Protection Act, 2012 (Act 843) · Enterprise Construction Privacy
            </p>
          </div>
        </div>

        {/* Tab switch header */}
        <div className="flex items-center gap-4 mt-6 border-b border-slate-200 text-xs font-medium">
          {onNavigateToTerms && (
            <button
              onClick={onNavigateToTerms}
              className="pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Terms of Service
            </button>
          )}
          <button className="pb-2 border-b-2 border-emerald-600 text-slate-900 font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Privacy &amp; Governance Policy
          </button>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-2xs space-y-8 text-sm leading-relaxed text-slate-700">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">01.</span>
            Regulatory Commitment under Ghana Act 843
          </h2>
          <p>
            QuoteHunter Ghana operates in strict adherence to the <strong>Data Protection Act, 2012 (Act 843)</strong> of the Parliament of the Republic of Ghana. We are registered with the <strong>Data Protection Commission (DPC)</strong> as both Data Controller and Data Processor for commercial construction information. We recognize that construction Bills of Quantities (BOQs), architectural project locations, and supplier unit prices represent sensitive commercial intellectual property that demand bank-grade safeguards.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">02.</span>
            Information We Collect &amp; Purpose of Processing
          </h2>
          <p>
            We collect only the organizational data strictly necessary to match material requests with verified suppliers, compute freight calculations, and ensure statutory tax transparency:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5 text-sm">
                <Database className="w-4 h-4 text-slate-600" />
                Contractor Organization Data
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-xs">
                <li>Registered company name and physical office address</li>
                <li>Construction project site locations across Ghana&apos;s 16 regions</li>
                <li>Material schedules, specifications, and BOQ imports</li>
                <li>Designated site receiver contacts and delivery logistics notes</li>
              </ul>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5 text-sm">
                <Lock className="w-4 h-4 text-slate-600" />
                Supplier Entity Data
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-xs">
                <li>Registrar General&apos;s Department registration and GRA TIN</li>
                <li>Warehouse geographic locations and serviced administrative regions</li>
                <li>Real-time material price books and inventory capacities</li>
                <li>Delivery vehicle fleet specs (tippers, flatbeds, crane trucks)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">03.</span>
            Commercial Non-Disclosure &amp; Supplier Bid Isolation
          </h2>
          <p>
            To prevent bid rigging, price fixing, or predatory commercial practices, QuoteHunter enforces strict technical bid isolation:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Zero Commercial Data Reselling:</strong> We never sell, monetize, or lease your procurement data, BOQs, or project materials to third parties, brokers, or competing building contractors.</li>
            <li><strong>Strict Bid Isolation:</strong> Competing suppliers can never see each other&apos;s unit prices or quotations. Quotations are strictly confidential between the submitting supplier and the RFQ issuer.</li>
            <li><strong>Encrypted Database Storage:</strong> All procurement records are housed in a managed PostgreSQL Cloud SQL database instance encrypted at rest with AES-256 and transmitted exclusively over HTTPS/TLS 1.3.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">04.</span>
            Immutable Audit Trail &amp; Fraud Prevention
          </h2>
          <p>
            To protect participants against unauthorized transactions and ensure full accountability for corporate compliance:
          </p>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs space-y-1.5 leading-relaxed">
            <div>• All login sessions, API calls, and IP timestamps are logged in the <code>audit_logs</code> table.</div>
            <div>• RFQ creation, quote submission, and order acceptance generate cryptographically signed audit events.</div>
            <div>• Administrative verification of suppliers records the auditor&apos;s ID, timestamp, and verification rationale.</div>
          </div>
          <p className="text-slate-500 text-xs">
            Audit logs cannot be altered or purged by regular users and are retained for six (6) years in accordance with Ghanaian commercial tax and financial auditing standards.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">05.</span>
            Participant Rights under Act 843: Export &amp; Deletion
          </h2>
          <p>
            Under Sections 35 to 43 of Ghana&apos;s Data Protection Act, 2012, all registered organizations have enforceable rights:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3.5 border border-slate-200 rounded-lg bg-white">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1 text-sm">
                <Download className="w-4 h-4 text-emerald-600" />
                Data Portability &amp; Export
              </div>
              <p className="text-slate-600 text-xs">
                Contractors may export their complete RFQ history, awarded quotations, and purchase order records in CSV format at any time without fees.
              </p>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-white">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1 text-sm">
                <Trash2 className="w-4 h-4 text-slate-500" />
                Account Deactivation
              </div>
              <p className="text-slate-600 text-xs">
                Users can request account closure. In compliance with statutory tax retention laws, transaction records are soft-deleted and credentials de-identified.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-emerald-700 font-medium">06.</span>
            Data Protection Officer (DPO) &amp; Contact
          </h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs space-y-1.5 leading-relaxed">
            <div className="font-semibold text-slate-900 text-sm">Office of the Data Protection Officer</div>
            <div>QuoteHunter Technologies Ghana Ltd</div>
            <div>DPC Registration Number: DPC-GH-2026-98124</div>
            <div>Spintex Road, Light Industrial District, Accra, Ghana</div>
            <div>Direct Compliance Inquiries: privacy@quotehunter.com.gh</div>
          </div>
        </section>
      </div>
    </div>
  );
};
