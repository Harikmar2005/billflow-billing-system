import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { FileText, ArrowLeft, Scale, AlertTriangle, CheckCircle, ShieldCheck, Printer } from 'lucide-react';

export const TermsConditionsView: React.FC = () => {
  const { setCurrentView, settings } = useBilling();
  const businessCity = settings?.city || 'Mumbai';
  const businessState = settings?.state || 'Maharashtra';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 text-xs text-slate-800 dark:text-slate-200">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Return to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Scale className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Terms &amp; Conditions of Service
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard Commercial License &amp; Billing Terms • Updated October 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Terms</span>
          </button>
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="px-3 py-1.5 rounded-lg font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Terms Sections */}
      <div className="space-y-6 leading-relaxed">
        {/* Important Notice Banner */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-1.5">
          <h2 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Tax Compliance &amp; Chartered Accountant Advisory Notice
          </h2>
          <p className="text-slate-700 dark:text-slate-300">
            BillFlow is a billing utility and financial accounting software application. While tax rates, round-offs, and intra/inter-state CGST, SGST, and IGST breakdowns are calculated in accordance with current Indian GST schedules, BillFlow does not provide licensed legal or tax advice. Users must reconcile their monthly GSTR-1, GSTR-3B, and annual audit filings with their certified Chartered Accountant (CA).
          </p>
        </div>

        {/* Section 1: Acceptance & License */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            1. Acceptance of Terms &amp; Software License
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            By operating, accessing, or creating tax invoices through BillFlow, your enterprise agrees to be bound by these Terms of Service. BillFlow grants your business a non-exclusive, non-transferable commercial license to manage point-of-sale invoices, inventory tracking, customer accounts, and sales intelligence.
          </p>
        </section>

        {/* Section 2: Invoice Integrity & Business Responsibilities */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            2. Invoice Integrity &amp; Statutory GSTIN Accuracy
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
            <li>
              <strong>GSTIN &amp; PAN Validity:</strong> The business operator is solely responsible for verifying the authenticity of 15-character GSTIN codes, HSN/SAC codes, and applicable tax slabs (0%, 5%, 12%, 18%, 28%) applied to line items.
            </li>
            <li>
              <strong>Sequence Numbers:</strong> Under Section 31 of the CGST Act, invoices must maintain consecutive alphanumeric numbering unique for each financial year. BillFlow enforces prefix and serial numbering but requires administrators to maintain audit continuity.
            </li>
            <li>
              <strong>Invoice Cancellation:</strong> Issued tax invoices cannot be deleted without audit trace. Cancelled invoices remain logged with cancellation reasons for tax ledger transparency.
            </li>
          </ul>
        </section>

        {/* Section 3: Limitation of Liability */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            3. Limitation of Liability
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            In no event shall BillFlow or its authors be liable for any indirect, punitive, or consequential commercial damages, including lost profits, tax penalties, input tax credit (ITC) claim rejections, or business interruptions arising out of incorrect customer state code configuration or server hardware failures.
          </p>
        </section>

        {/* Section 4: Jurisdiction & Governing Law */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            4. Governing Law &amp; Jurisdiction
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            These Terms are governed exclusively by the laws of India. Any legal dispute, claim, or statutory proceedings arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in {businessCity}, {businessState}.
          </p>
        </section>
      </div>
    </div>
  );
};
