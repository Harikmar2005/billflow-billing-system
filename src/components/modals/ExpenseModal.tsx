import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { ExpenseCategory, PaymentMethod } from '../../types';
import { X, Receipt, IndianRupee, Calendar } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'rent', label: 'Office / Shop Rent' },
  { value: 'utilities', label: 'Electricity, Water & Internet' },
  { value: 'salaries', label: 'Employee Salaries & Wages' },
  { value: 'inventory_purchase', label: 'Raw Materials & Inventory Purchase' },
  { value: 'transport', label: 'Freight, Logistics & Fuel' },
  { value: 'marketing', label: 'Advertising & Marketing' },
  { value: 'office_supplies', label: 'Stationery & Office Supplies' },
  { value: 'repairs', label: 'Maintenance & Repairs' },
  { value: 'tax_fees', label: 'CA Fees & Govt Compliance' },
  { value: 'other', label: 'Miscellaneous Operating Expense' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { createExpense, addToast } = useBilling();

  const [category, setCategory] = useState<ExpenseCategory>('utilities');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isGstInputCredit, setIsGstInputCredit] = useState(false);
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Expense description is required', 'error');
      return;
    }
    if (amount <= 0) {
      addToast('Expense amount must be greater than zero', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await createExpense({
        category,
        description: title.trim(),
        amount: Number(amount),
        expenseDate,
        vendorName: vendorName.trim() || 'General Vendor',
        paymentMethod: paymentMethod as PaymentMethod,
      });
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Record Business Expense
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Category & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Description / Purpose <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. High-speed broadband monthly subscription"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Amount & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Amount Paid (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Paid To
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Airtel Business / Local Landlord"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paid Via
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
              >
                <option value="bank_transfer">Net Banking / IMPS / NEFT</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Petty Cash</option>
                <option value="card">Company Debit / Credit Card</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / UTR / Voucher #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR-92837482"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* GST Input Tax Credit (ITC) Checkbox */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGstInputCredit}
                onChange={(e) => setIsGstInputCredit(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                Vendor provided GST Tax Invoice (Eligible for Input Tax Credit - ITC)
              </span>
            </label>

            {isGstInputCredit && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">GST Component in bill:</span>
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-right"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by Director, Voucher #44"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
