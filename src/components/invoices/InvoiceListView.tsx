import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Invoice, PaymentStatus, InvoiceStatus } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import {
  FileText,
  Plus,
  Filter,
  Download,
  Printer,
  CreditCard,
  Ban,
  Search,
  ExternalLink,
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface InvoiceListViewProps {
  onOpenRecordPayment: (invoice: Invoice) => void;
  onOpenCancelInvoice: (invoice: Invoice) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  onOpenRecordPayment,
  onOpenCancelInvoice,
}) => {
  const {
    invoices,
    customers,
    settings,
    searchQuery,
    setSearchQuery,
    setCurrentView,
    setPreviewInvoice,
    addToast,
  } = useBilling();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q));

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || inv.paymentStatus === paymentFilter;
    const matchesCust = customerFilter === 'all' || inv.customerId === customerFilter;
    const matchesStart = !startDate || inv.invoiceDate >= startDate;
    const matchesEnd = !endDate || inv.invoiceDate <= endDate;

    return matchesSearch && matchesStatus && matchesPayment && matchesCust && matchesStart && matchesEnd;
  });

  const handleDownloadPdf = (invoice: Invoice) => {
    if (!settings) return;
    try {
      const doc = generateInvoicePDF(invoice, settings);
      doc.save(`${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
      addToast(`Downloaded PDF for ${invoice.invoiceNumber}`, 'success');
    } catch {
      addToast('Error generating PDF', 'error');
    }
  };

  const handleExportCsv = () => {
    if (filteredInvoices.length === 0) {
      addToast('No invoices to export', 'info');
      return;
    }

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Status',
      'Payment Status',
      'Taxable Value',
      'CGST',
      'SGST',
      'IGST',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
    ];

    const rows = filteredInvoices.map((i) => [
      `"${i.invoiceNumber}"`,
      `"${i.invoiceDate}"`,
      `"${i.dueDate}"`,
      `"${i.customerName}"`,
      `"${i.customerGstin || ''}"`,
      `"${i.placeOfSupply}"`,
      `"${i.status}"`,
      `"${i.paymentStatus}"`,
      i.totalTaxableAmount.toFixed(2),
      i.totalCgst.toFixed(2),
      i.totalSgst.toFixed(2),
      i.totalIgst.toFixed(2),
      i.totalAmount.toFixed(2),
      i.amountPaid.toFixed(2),
      i.balanceDue.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BillFlow_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported invoices to CSV', 'info');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Tax Invoices Ledger
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({filteredInvoices.length} of {invoices.length})
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track issued tax invoices, payment settlements, cancellations, and export GST records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />

        {/* Payment Status */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Invoice Lifecycle Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Life Cycle Statuses</option>
          <option value="issued">Issued</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Customer Filter */}
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 max-w-xs truncate"
        >
          <option value="all">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-400">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          />
          <span className="text-slate-400">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No invoices match your filter criteria.</p>
            <p className="mt-1">Create a new invoice or adjust your search filter above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">INVOICE NO</th>
                  <th className="py-3 px-3">CUSTOMER & GSTIN</th>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">DUE DATE</th>
                  <th className="py-3 px-3 text-right">TOTAL (₹)</th>
                  <th className="py-3 px-3 text-right">PAID (₹)</th>
                  <th className="py-3 px-3 text-right">BALANCE DUE (₹)</th>
                  <th className="py-3 px-3 text-center">PAYMENT STATUS</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      inv.status === 'cancelled' ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/30' : ''
                    }`}
                  >
                    {/* Invoice Number */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>

                    {/* Customer & GSTIN */}
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                        {inv.customerName}
                      </div>
                      {inv.customerGstin ? (
                        <span className="font-mono text-[10px] text-slate-500">
                          GSTIN: {inv.customerGstin}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unregistered Buyer</span>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {formatDate(inv.dueDate)}
                    </td>

                    {/* Financial Amounts */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right text-teal-600 dark:text-teal-400 font-medium">
                      {formatINR(inv.amountPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span className={inv.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                        {formatINR(inv.balanceDue)}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3 text-center font-sans">
                      {inv.status === 'cancelled' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 line-through">
                          Cancelled
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                              : inv.paymentStatus === 'partially_paid'
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                              : inv.paymentStatus === 'overdue'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {inv.paymentStatus.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View / Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          className="p-1 rounded text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {inv.status !== 'cancelled' && inv.balanceDue > 0 && (
                          <button
                            onClick={() => onOpenRecordPayment(inv)}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => onOpenCancelInvoice(inv)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Cancel Invoice & Restore Stock"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
