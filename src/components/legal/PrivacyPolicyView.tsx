import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, Building, Eye, Printer, Download } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  const { setCurrentView, settings } = useBilling();

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
                <Shield className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Privacy Policy &amp; Data Protection
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Effective Date: October 12, 2026 • Compliant with Indian DPDP Act 2023 &amp; IT Rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Policy</span>
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

      {/* Main Content Cards */}
      <div className="space-y-6 leading-relaxed">
        {/* Summary Card */}
        <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 space-y-2">
          <h2 className="font-bold text-sm text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            Key Privacy Commitment
          </h2>
          <p className="text-slate-700 dark:text-slate-300">
            BillFlow is an on-premise &amp; server-proxied billing system designed for Indian MSMEs. Your commercial data—including Goods and Services Tax Identification Numbers (GSTIN), Permanent Account Numbers (PAN), client billing ledgers, and transaction values—remains strictly under your control. We do not sell, rent, or monetize your trade records.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            1. Information Processed by BillFlow
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            To generate GST-compliant tax invoices, BillFlow processes the following operational business information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li><strong>Seller Business Information:</strong> Legal business name, trade name, registered GSTIN, PAN, bank details (IFSC, account number, UPI ID), and dispatch address.</li>
            <li><strong>Customer Ledger Details:</strong> Customer name, billing/shipping address, state code, GSTIN/UIN, contact phone, and email.</li>
            <li><strong>Line Items &amp; Inventory:</strong> Product item names, HSN/SAC codes, predefined selling rates, GST tax rates (0%, 5%, 12%, 18%, 28%), stock quantities, and inventory movement logs.</li>
            <li><strong>Financial Transaction Logs:</strong> Invoice numbers, payment receipts, mode of payment (UPI, NEFT/RTGS, Cheque, Cash), and operational business expenses.</li>
          </ul>
        </section>

        {/* Section 2: Zero Front-End Secrets & Infrastructure Security */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            2. Secret Hygiene &amp; Data Security Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Zero Front-End Secrets</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                No private API keys, database credentials, or third-party service tokens are embedded in client-side bundles. All sensitive AI assistance and database operations execute via server-side isolated endpoints (<code className="font-mono text-teal-600">/api/*</code>).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Encrypted Transmission (HTTPS)</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                All network communication between client workstations and the billing server is strictly enforced over TLS 1.3 / HTTPS with HSTS headers, protecting against interception or man-in-the-middle tampering.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Cookies & Local Storage */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            3. Local Storage &amp; Cookie Usage
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            BillFlow uses lightweight client storage solely to power functional application state:
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="font-mono font-semibold">theme_mode</span>
              <span className="text-slate-500">Persists your visual dark or light mode preference</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="font-mono font-semibold">billflow_cookie_consent</span>
              <span className="text-slate-500">Records your privacy banner selection timestamp</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="font-mono font-semibold">billflow_analytics_events</span>
              <span className="text-slate-500">Aggregates anonymous local usage metrics without third-party ad beacons</span>
            </div>
          </div>
        </section>

        {/* Section 4: Data Rights & Grievance */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            4. Statutory Rights &amp; Grievance Officer
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Under India's Digital Personal Data Protection Act (DPDP Act 2023), you hold the right to access, rectify, and purge your stored records at any time via the Settings page or by contacting our data protection desk:
          </p>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
            <p><strong>Business:</strong> {settings?.businessName || 'Apex Infotech & Hardware Solutions'}</p>
            <p><strong>Grievance Email:</strong> {settings?.email || 'billing@apexinfotech.in'}</p>
            <p><strong>Contact Desk:</strong> {settings?.phone || '+91 98201 54321'}</p>
            <p><strong>Registered Address:</strong> {settings?.address || 'Shop No. 12, Lamington Road, Mumbai - 400007, Maharashtra'}</p>
          </div>
        </section>
      </div>
    </div>
  );
};
