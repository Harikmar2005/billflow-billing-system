import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Product } from '../../types';
import { X, SlidersHorizontal, Package, AlertCircle } from 'lucide-react';

interface AdjustStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { adjustStock, addToast } = useBilling();

  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('purchase_received');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const currentStock = product.stockQuantity || 0;
  const delta = mode === 'add' ? quantity : -quantity;
  const projectedStock = currentStock + delta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }
    if (projectedStock < 0) {
      addToast(`Cannot deduct more than available stock (${currentStock} ${product.unit})`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const reasonLabel = `${reason}: ${notes || 'Manual stock correction'}`;
      await adjustStock(product.id, delta, reasonLabel);
      onClose();
    } catch {
      // Error in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Adjust Stock Inventory
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Summary Box */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {product.name}
            </div>
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>SKU: {product.sku || '-'}</span>
              <span>
                Current In Stock:{' '}
                <strong className="text-teal-600 dark:text-teal-400">
                  {currentStock} {product.unit}
                </strong>
              </span>
            </div>
          </div>

          {/* Add vs Deduct toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                  mode === 'add'
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                + Add Stock (Inflow)
              </button>
              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                  mode === 'deduct'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                - Deduct Stock (Outflow)
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity to {mode === 'add' ? 'Add' : 'Deduct'} ({product.unit})
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono text-sm font-semibold"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
            >
              {mode === 'add' ? (
                <>
                  <option value="New stock delivery from supplier">Supplier Goods Received</option>
                  <option value="Customer sales return accepted">Customer Sales Return</option>
                  <option value="Physical count audit correction">Physical Audit Surplus (+)</option>
                  <option value="Correction of previous entry error">Data Entry Correction</option>
                </>
              ) : (
                <>
                  <option value="Damaged or expired inventory write-off">Damaged / Defective Stock</option>
                  <option value="Physical count audit shrinkage">Physical Audit Loss / Theft (-)</option>
                  <option value="Internal usage or testing sample">Internal / Office Usage</option>
                  <option value="Returned to vendor">Vendor Return</option>
                </>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Reference / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GRN #4928 or damaged during transit"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Projected summary */}
          <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] flex justify-between font-mono">
            <span className="text-slate-500 font-sans">New Projected Stock:</span>
            <span className={`font-bold ${projectedStock < (product.lowStockThreshold || 5) ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'}`}>
              {projectedStock} {product.unit}
            </span>
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
              disabled={submitting || quantity <= 0}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
