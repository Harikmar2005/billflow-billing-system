import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Invoice } from '../../types';
import { formatINR } from '../../utils/billing';
import { X, CreditCard, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { recordPayment, addToast } = useBilling();

  const [amount, setAmount] = useState<number>(invoice?.balanceDue || 0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [honeypot, setHoneypot] = useState<string>('');

  // Sync default amount when invoice opens
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceDue);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot.trim()) {
      console.warn('[SPAM SHIELD] Automated bot submission rejected via honeypot');
      onClose();
      return;
    }
    if (amount <= 0) {
      addToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (amount > invoice.balanceDue) {
      addToast(`Payment amount cannot exceed balance due of ${formatINR(invoice.balanceDue)}`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment({
        invoiceId: invoice.id,
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
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
      <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Record Payment Receipt
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500 font-sans">Invoice:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500 font-sans">Customer:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {invoice.customerName}
              </span>
            </div>
            <div className="flex justify-between font-mono border-t border-slate-200 dark:border-slate-800 pt-1">
              <span className="text-slate-500 font-sans">Current Balance Due:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {formatINR(invoice.balanceDue)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Amount Received (₹) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              max={invoice.balanceDue}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-teal-700 dark:text-teal-400"
            />
            {amount < invoice.balanceDue && (
              <span className="text-[10px] text-slate-500 mt-1 block">
                Partial payment: Remaining balance of {formatINR(invoice.balanceDue - amount)} will be due.
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="cash">Cash Counter</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Transaction / Reference / UTR No.
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI/409281729104 or Cheque #204918"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remarks..."
              className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-sm"
            >
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
