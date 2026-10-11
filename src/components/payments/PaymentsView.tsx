import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Payment } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  IndianRupee,
  ReceiptText
} from 'lucide-react';

interface PaymentsViewProps {
  onOpenRecordPayment: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenRecordPayment }) => {
  const { payments, invoices, searchQuery, setPreviewInvoice } = useBilling();
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.referenceNumber.toLowerCase().includes(q);

    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Payment Collections Ledger
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({filteredPayments.length} entries)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log cash, UPI, and bank transfer receipts linked directly to customer tax invoices.
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Filtered Collections</div>
          <div className="mt-1 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
            {formatINR(totalCollected)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total cash received for view</div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Total Transactions</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {filteredPayments.length} Receipts
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Manually verified entries</div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Filter by Method</div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="mt-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="cash">Cash Counter</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No payment receipts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">INVOICE NO</th>
                  <th className="py-3 px-3">CUSTOMER</th>
                  <th className="py-3 px-3">PAYMENT METHOD</th>
                  <th className="py-3 px-3">REFERENCE / UTR NO</th>
                  <th className="py-3 px-3 text-right">AMOUNT RECEIVED</th>
                  <th className="py-3 px-3">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredPayments.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoiceId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="py-3 px-3 font-bold">
                        {inv ? (
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            {p.invoiceNumber}
                          </button>
                        ) : (
                          p.invoiceNumber
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.referenceNumber || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                        {p.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
