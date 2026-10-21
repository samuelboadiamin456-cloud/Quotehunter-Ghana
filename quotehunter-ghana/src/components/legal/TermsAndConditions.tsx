import React from 'react';
import { ArrowLeft, Scale, Shield, FileText, CheckCircle2, Printer, ExternalLink } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack: () => void;
  onNavigateToPolicy?: () => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  onBack,
  onNavigateToPolicy,
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
            {onNavigateToPolicy && (
              <button
                onClick={onNavigateToPolicy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                View Privacy Policy
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start sm:items-center gap-3 pt-6">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Statutory B2B Framework
              </span>
              <span className="text-xs text-slate-500">
                Act 772 &amp; Act 798 Compliant
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Terms &amp; Commercial Conditions of Service
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Effective Date: October 2026 · Governing B2B Building Material Procurement across all 16 Regions of Ghana
            </p>
          </div>
        </div>

        {/* Tab switch header */}
        <div className="flex items-center gap-4 mt-6 border-b border-slate-200 text-xs font-medium">
          <button className="pb-2 border-b-2 border-amber-600 text-slate-900 font-semibold flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            Terms of Service
          </button>
          {onNavigateToPolicy && (
            <button
              onClick={onNavigateToPolicy}
              className="pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Privacy &amp; Governance Policy
            </button>
          )}
        </div>
      </div>

      {/* Main Document Content */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-2xs space-y-8 text-sm leading-relaxed text-slate-700">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">01.</span>
            Platform Scope &amp; Acceptance of Agreement
          </h2>
          <p>
            These Terms and Conditions govern the access and commercial use of the <strong>QuoteHunter Ghana</strong> procurement platform operated by QuoteHunter Technologies Ghana Ltd (&quot;QuoteHunter&quot;, &quot;we&quot;, &quot;us&quot;). By creating an organization profile, submitting a Request for Quotation (RFQ), transmitting a supplier quotation, or confirming a purchase order, you expressly agree to be bound by these Terms and all applicable laws of the Republic of Ghana, including the <em>Electronic Transactions Act, 2008 (Act 772)</em> and the <em>Sale of Goods Act, 1962 (Act 137)</em>.
          </p>
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-md text-amber-900 text-xs leading-normal">
            <strong>Important Notice:</strong> QuoteHunter Ghana is exclusively engineered for registered commercial builders, civil engineering contractors, quantity surveyors, real estate developers, and certified building material suppliers. It is not intended for non-commercial consumer retail transactions.
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">02.</span>
            Participant Eligibility &amp; Business Verification
          </h2>
          <p>
            To uphold commercial trust and project safety across Ghanaian construction works:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Suppliers:</strong> Must hold an active business registration certificate issued by the Registrar General’s Department (RGD) and a verifiable Taxpayer Identification Number (TIN) issued by the Ghana Revenue Authority (GRA).</li>
            <li><strong>Verification Audits:</strong> Suppliers receive the &quot;Verified Supplier&quot; status only after physical premise confirmation, warehouse stock audit, and historical fulfillment checks by QuoteHunter operations managers.</li>
            <li><strong>Contractor Accounts:</strong> Builders and quantity surveyors must represent legitimate building projects or corporate entities with verifiable physical site addresses in Ghana.</li>
            <li><strong>Sanctions:</strong> Providing fraudulent corporate identity, misleading TIN credentials, or counterfeit mill test certificates will lead to immediate account suspension, blacklisting, and reporting to law enforcement authorities.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">03.</span>
            Material Requests (RFQs) and Supplier Quotations
          </h2>
          <p>
            Contractors utilize QuoteHunter Ghana to issue discrete Requests for Quotations (RFQs) specifying line item descriptions, quantities, technical specifications, and delivery locations across Ghana&apos;s 16 administrative regions.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Commercial Quotations:</strong> All quotes submitted by suppliers constitute firm, binding commercial offers throughout the specified &quot;Valid Until&quot; timeframe (typically 7 to 30 days).</li>
            <li><strong>Price Integrity in Ghanaian Cedis (GH₵):</strong> Unit prices and haulage charges must be all-inclusive or clearly state applicable Ghanaian statutory levies (VAT, NHIL, GETFund, COVID-19 Levy where applicable). Unilateral price increases after quotation submission are strictly prohibited.</li>
            <li><strong>Independent Comparison:</strong> QuoteHunter Ghana functions as an impartial procurement network. We never tamper with price comparisons or artificially favor specific suppliers; contractors evaluate quotes transparently.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">04.</span>
            Quotation Acceptance &amp; Purchase Order Formation
          </h2>
          <p>
            When a contractor clicks <strong>&quot;Accept &amp; Generate Order&quot;</strong> on a selected quotation, the platform issues an official, sequential Purchase Order (e.g., <code className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-medium">ORD-GH-2026-XXXX</code>). This constitutes a valid, legally enforceable bilateral contract between the buyer organization and the supplier organization.
          </p>
          <p>
            The generated purchase order includes line item breakdowns, verified unit rates, haulage terms, agreed delivery dates, and site delivery instructions.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">05.</span>
            Ghana Standards Authority (GSA) Compliance
          </h2>
          <p>
            Structural safety is paramount. All building materials quoted and supplied through QuoteHunter Ghana must adhere to mandatory national standards:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1 text-sm">Cement &amp; Binders</div>
              <p className="text-slate-600 text-xs">
                Must strictly comply with <strong>GS 1118:2016</strong> (Grade 42.5R, 42.5N, or 32.5R) manufactured by licensed producers.
              </p>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1 text-sm">High-Tensile Steel</div>
              <p className="text-slate-600 text-xs">
                Must conform to <strong>BS 4449 Grade 500B</strong> with valid tensile yield strength test reports provided upon request.
              </p>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1 text-sm">Aggregates &amp; Blocks</div>
              <p className="text-slate-600 text-xs">
                Aggregates must meet <strong>BS 882</strong> silt-free specs; solid/hollow blocks must meet Ghana building code load-bearing ratings.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">06.</span>
            Delivery Logistics, Site Access &amp; Inspection
          </h2>
          <p>
            Fulfillment occurs through four sequential milestones tracked in QuoteHunter:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 border border-slate-200 rounded bg-slate-50 text-center font-medium text-slate-700">1. Placed</div>
            <div className="p-2.5 border border-slate-200 rounded bg-slate-50 text-center font-medium text-slate-700">2. Confirmed</div>
            <div className="p-2.5 border border-amber-200 rounded bg-amber-50 text-center font-medium text-amber-800">3. In Transit</div>
            <div className="p-2.5 border border-emerald-200 rounded bg-emerald-50 text-center font-medium text-emerald-800">4. Delivered</div>
          </div>
          <p className="mt-2 text-slate-600">
            Contractors are responsible for providing clear site access for heavy commercial vehicles (such as 15m³–30m³ tippers or flatbeds). Material inspection must be performed upon offloading, and any discrepancies must be noted on the digital or physical delivery waybill within 24 hours.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">07.</span>
            Governing Law &amp; Dispute Arbitration
          </h2>
          <p>
            These Terms are governed by and construed in accordance with the substantive laws of the Republic of Ghana. In the event of any dispute or claim arising out of or in connection with a quotation or purchase order, the parties shall first engage in good-faith mediation facilitated by QuoteHunter compliance officers. If unresolved within 21 days, disputes shall be finally settled by arbitration in Accra under the <em>Alternative Dispute Resolution Act, 2010 (Act 798)</em>.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5">
            <span className="text-amber-600 font-medium">08.</span>
            Corporate Contact &amp; Legal Office
          </h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs space-y-1.5 leading-relaxed">
            <div className="font-semibold text-slate-900 text-sm">QuoteHunter Technologies Ghana Ltd</div>
            <div>Commercial Registry: CS148202026 · GRA TIN: C0029481920</div>
            <div>Corporate Address: Spintex Road, Light Industrial District, Greater Accra, Ghana</div>
            <div>Support Desk: +233 (0) 30 294 8100 · Email: legal@quotehunter.com.gh</div>
          </div>
        </section>
      </div>
    </div>
  );
};
