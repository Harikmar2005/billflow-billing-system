import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { formatINR } from '../../utils/billing';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Users,
  Package,
  Clock,
  CheckCircle2,
  Receipt,
  Download,
  Percent
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { invoices, payments, expenses, products, customers, addToast } = useBilling();
  const [activeTab, setActiveTab] = useState<'gst' | 'sales' | 'customers' | 'products' | 'profit'>('gst');

  // Filter active (issued) invoices
  const activeInvoices = invoices.filter((i) => i.status !== 'cancelled');

  // GSTR-1 Tax Computation
  const intraStateInvoices = activeInvoices.filter((i) => !i.isInterState);
  const interStateInvoices = activeInvoices.filter((i) => i.isInterState);

  const totalTaxableIntra = intraStateInvoices.reduce((s, i) => s + i.totalTaxableAmount, 0);
  const totalCgst = intraStateInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const totalSgst = intraStateInvoices.reduce((s, i) => s + i.totalSgst, 0);

  const totalTaxableInter = interStateInvoices.reduce((s, i) => s + i.totalTaxableAmount, 0);
  const totalIgst = interStateInvoices.reduce((s, i) => s + i.totalIgst, 0);

  const totalGstLiability = totalCgst + totalSgst + totalIgst;
  const totalGrossSales = activeInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCashCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Export CSV for current tab
  const handleExportTabCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `BillFlow_Report_${activeTab}.csv`;

    if (activeTab === 'gst') {
      headers = ['Category', 'Type', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST'];
      rows = [
        ['Intra-State (Local)', 'B2B/B2C', totalTaxableIntra.toFixed(2), totalCgst.toFixed(2), totalSgst.toFixed(2), '0.00', (totalCgst + totalSgst).toFixed(2)],
        ['Inter-State (Out of State)', 'B2B/B2C', totalTaxableInter.toFixed(2), '0.00', '0.00', totalIgst.toFixed(2), totalIgst.toFixed(2)],
        ['TOTAL CONSOLIDATED', 'ALL', (totalTaxableIntra + totalTaxableInter).toFixed(2), totalCgst.toFixed(2), totalSgst.toFixed(2), totalIgst.toFixed(2), totalGstLiability.toFixed(2)],
      ];
    } else if (activeTab === 'customers') {
      headers = ['Customer Name', 'GSTIN', 'State', 'Total Invoiced', 'Amount Paid', 'Balance Due'];
      rows = customers.map((c) => {
        const custInvoices = activeInvoices.filter((i) => i.customerId === c.id);
        const billed = custInvoices.reduce((s, i) => s + i.totalAmount, 0);
        const paid = custInvoices.reduce((s, i) => s + i.amountPaid, 0);
        return [c.name, c.gstin || 'Unregistered', c.state, billed.toFixed(2), paid.toFixed(2), (billed - paid).toFixed(2)];
      });
    } else if (activeTab === 'products') {
      headers = ['Product Name', 'SKU', 'Type', 'GST %', 'Stock Quantity', 'Unit Price', 'Cost Price'];
      rows = products.map((p) => [
        p.name,
        p.sku || '-',
        p.type,
        p.gstRate,
        p.stockQuantity,
        p.sellingPrice.toFixed(2),
        p.purchasePrice.toFixed(2),
      ]);
    } else {
      headers = ['Metric', 'Amount (INR)'];
      rows = [
        ['Total Gross Billed Sales', totalGrossSales.toFixed(2)],
        ['Total Cash Receipts Collected', totalCashCollected.toFixed(2)],
        ['Total Operating Expenses', totalExpenses.toFixed(2)],
        ['Net Cash Flow (Collections - Expenses)', (totalCashCollected - totalExpenses).toFixed(2)],
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${activeTab.toUpperCase()} report to CSV`, 'info');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            GST & Financial Intelligence Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready reconciliations for GSTR-1, customer aging balances, product margins, and cash flow.
          </p>
        </div>

        <button
          onClick={handleExportTabCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Current Tab (CSV)</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('gst')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'gst'
              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>GSTR-1 Tax Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'sales'
              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Sales & Cash Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'customers'
              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Ledger Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Product Valuation</span>
        </button>
      </div>

      {/* Tab 1: GSTR-1 Tax Summary */}
      {activeTab === 'gst' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Taxable Turnover</span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatINR(totalTaxableIntra + totalTaxableInter)}
              </div>
              <span className="text-[11px] text-slate-500">Subject to GST slabs</span>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Output GST Liability</span>
              <div className="mt-1 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
                {formatINR(totalGstLiability)}
              </div>
              <span className="text-[11px] text-slate-500">CGST + SGST + IGST Collected</span>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Billed Invoices</span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {activeInvoices.length} Invoices
              </div>
              <span className="text-[11px] text-slate-500">Excludes cancelled vouchers</span>
            </div>
          </div>

          {/* GSTR Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">SUPPLY CATEGORY</th>
                  <th className="py-3 px-3">PLACE OF SUPPLY</th>
                  <th className="py-3 px-3 text-right">TAXABLE VALUE</th>
                  <th className="py-3 px-3 text-right">CGST (9%)</th>
                  <th className="py-3 px-3 text-right">SGST (9%)</th>
                  <th className="py-3 px-3 text-right">IGST (18%)</th>
                  <th className="py-3 px-3 text-right">TOTAL TAX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                    Intra-State Supplies
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-400">
                    Within Home State
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(totalTaxableIntra)}
                  </td>
                  <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-400 font-semibold">
                    {formatINR(totalCgst)}
                  </td>
                  <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-400 font-semibold">
                    {formatINR(totalSgst)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">₹0.00</td>
                  <td className="py-3 px-3 text-right font-bold text-teal-700 dark:text-teal-400">
                    {formatINR(totalCgst + totalSgst)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                    Inter-State Supplies
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-400">
                    Outside Home State
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(totalTaxableInter)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">₹0.00</td>
                  <td className="py-3 px-3 text-right text-slate-400">₹0.00</td>
                  <td className="py-3 px-3 text-right text-purple-700 dark:text-purple-400 font-semibold">
                    {formatINR(totalIgst)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-purple-700 dark:text-purple-400">
                    {formatINR(totalIgst)}
                  </td>
                </tr>

                <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t-2 border-slate-200 dark:border-slate-800">
                  <td className="py-3 px-3 font-sans">TOTAL CONSOLIDATED</td>
                  <td className="py-3 px-3 font-sans">-</td>
                  <td className="py-3 px-3 text-right">
                    {formatINR(totalTaxableIntra + totalTaxableInter)}
                  </td>
                  <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-400">
                    {formatINR(totalCgst)}
                  </td>
                  <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-400">
                    {formatINR(totalSgst)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-700 dark:text-purple-400">
                    {formatINR(totalIgst)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                    {formatINR(totalGstLiability)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sales & Collections Reconciliation */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase text-slate-400">Gross Billed Sales</span>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatINR(totalGrossSales)}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase text-slate-400">Actual Collections</span>
              <div className="mt-1 text-xl font-bold font-mono text-teal-600">
                {formatINR(totalCashCollected)}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase text-slate-400">Operating Expenses</span>
              <div className="mt-1 text-xl font-bold font-mono text-rose-600">
                {formatINR(totalExpenses)}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase text-slate-400">Net Operating Cash</span>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatINR(totalCashCollected - totalExpenses)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Customer Ledger Balances */}
      {activeTab === 'customers' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">CUSTOMER NAME</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">STATE</th>
                <th className="py-3 px-3 text-right">TOTAL BILLED</th>
                <th className="py-3 px-3 text-right">TOTAL PAID</th>
                <th className="py-3 px-3 text-right">OUTSTANDING DUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {customers.map((c) => {
                const custInvoices = activeInvoices.filter((i) => i.customerId === c.id);
                const billed = custInvoices.reduce((s, i) => s + i.totalAmount, 0);
                const paid = custInvoices.reduce((s, i) => s + i.amountPaid, 0);
                const due = billed - paid;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{c.gstin || 'Unregistered'}</td>
                    <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-400">{c.state}</td>
                    <td className="py-3 px-3 text-right font-semibold">{formatINR(billed)}</td>
                    <td className="py-3 px-3 text-right text-teal-600">{formatINR(paid)}</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-600">
                      {formatINR(due)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Product Valuation */}
      {activeTab === 'products' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">PRODUCT</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">TYPE</th>
                <th className="py-3 px-3 text-center">GST %</th>
                <th className="py-3 px-3 text-right">SELLING PRICE</th>
                <th className="py-3 px-3 text-right">COST PRICE</th>
                <th className="py-3 px-3 text-right">EST. MARGIN</th>
                <th className="py-3 px-3 text-right">STOCK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {products.map((p) => {
                const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{p.sku || '-'}</td>
                    <td className="py-3 px-3 font-sans capitalize">{p.type}</td>
                    <td className="py-3 px-3 text-center">{p.gstRate}%</td>
                    <td className="py-3 px-3 text-right font-semibold">{formatINR(p.sellingPrice)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatINR(p.purchasePrice)}</td>
                    <td className="py-3 px-3 text-right font-bold text-teal-600">
                      {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {p.type === 'service' ? 'Service' : `${p.stockQuantity} ${p.unit}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
