import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Invoice } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DeleteInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { deleteInvoice } = useBilling();
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when invoice changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen, invoice]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, onClose]);

  if (!isOpen || !invoice) return null;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setErrorMessage(null);
      await deleteInvoice(invoice.id);
      onClose();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Failed to delete invoice from server.';
      setErrorMessage(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-invoice-title"
    >
      <div className="w-full max-w-md rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-rose-950/40 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="delete-invoice-title"
                className="font-bold text-sm text-rose-900 dark:text-rose-200"
              >
                Delete Invoice?
              </h2>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/70 font-mono">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 text-[11px] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                This action cannot be undone. Are you sure you want to delete this invoice?
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                Deleting this invoice will permanently remove it from your records. Product inventory
                will be restored to your catalog and any linked payments will be unlinked.
              </p>
            </div>
          </div>

          {/* Invoice Summary Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Invoice Number:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Customer:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                {invoice.customerName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Invoice Date:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatDate(invoice.invoiceDate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Total Amount:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatINR(invoice.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-500 font-sans">Payment Status:</span>
              <span className="uppercase text-[10px] font-bold text-slate-700 dark:text-slate-300">
                {invoice.paymentStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Error Message if deletion failed */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
              <span className="font-semibold">Deletion Failed: </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
            >
              Keep Invoice
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
