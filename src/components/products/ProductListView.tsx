import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Product } from '../../types';
import { formatINR } from '../../utils/billing';
import {
  Package,
  Plus,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  AlertCircle
} from 'lucide-react';
import { CustomCatalogReplaceModal } from './CustomCatalogReplaceModal';

interface ProductListViewProps {
  onOpenCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onOpenAdjustStock: (product: Product) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  onOpenCreateProduct,
  onEditProduct,
  onOpenAdjustStock,
}) => {
  const {
    products,
    deleteProduct,
    searchQuery,
  } = useBilling();

  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service' | 'needs_review'>('all');
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  const unverifiedCount = products.filter((p) => p.requiresManualRateVerification || p.isIncomplete).length;

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.hsnSacCode && p.hsnSacCode.includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.sno && String(p.sno).includes(q));

    let matchesType = true;
    if (typeFilter === 'product') matchesType = p.type === 'product' && p.status !== 'archived';
    else if (typeFilter === 'service') matchesType = p.type === 'service' && p.status !== 'archived';
    else if (typeFilter === 'needs_review') matchesType = !!(p.requiresManualRateVerification || p.isIncomplete);
    else matchesType = p.status !== 'archived';

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete item "${name}" from catalog?`)) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Inventory &amp; Items Catalog
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({filteredProducts.length} items)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical goods, services, predefined selling rates, GST classification, and stock records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReplaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 shadow-sm transition-all"
            title="Import Product List (S.NO, DESCRIPTION, Final Rate)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import / Replace Catalog</span>
          </button>

          <button
            onClick={onOpenCreateProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Flagged Item Review Banner */}
      {unverifiedCount > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold">{unverifiedCount} item(s) require manual rate review</span>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                Contains non-numeric values from the source rate sheet (e.g. "31KG"). Rates are held uncalculated until verified.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTypeFilter(typeFilter === 'needs_review' ? 'all' : 'needs_review')}
            className="px-2.5 py-1 rounded bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-colors shrink-0"
          >
            {typeFilter === 'needs_review' ? 'View All Items' : 'Filter Flagged Items'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 w-fit text-xs font-semibold">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Items ({products.filter((p) => p.status !== 'archived').length})
        </button>
        <button
          onClick={() => setTypeFilter('product')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'product'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Physical Products ({products.filter((p) => p.type === 'product' && p.status !== 'archived').length})
        </button>
        <button
          onClick={() => setTypeFilter('service')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'service'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Services ({products.filter((p) => p.type === 'service' && p.status !== 'archived').length})
        </button>
        {unverifiedCount > 0 && (
          <button
            onClick={() => setTypeFilter('needs_review')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              typeFilter === 'needs_review'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Review ({unverifiedCount})</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No products or services found.</p>
            <button
              onClick={onOpenCreateProduct}
              className="mt-3 px-3 py-1.5 rounded-md bg-teal-600 text-white font-semibold text-xs"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">ITEM NAME & SKU</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">HSN/SAC</th>
                  <th className="py-3 px-3 text-right">SELLING PRICE</th>
                  <th className="py-3 px-3 text-right">COST PRICE</th>
                  <th className="py-3 px-3 text-center">GST RATE</th>
                  <th className="py-3 px-3 text-right">STOCK ON HAND</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredProducts.map((p) => {
                  const isLowStock = p.type === 'product' && p.stockQuantity <= p.lowStockThreshold;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      p.requiresManualRateVerification ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                    }`}>
                      {/* Name & SKU & S.NO */}
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {p.requiresManualRateVerification && (
                            <span className="p-0.5 rounded bg-amber-500/20 text-amber-500" title="Non-numeric rate needs verification">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span>{p.name}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {p.sno && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                              S.NO: {p.sno}
                            </span>
                          )}
                          <span>SKU: {p.sku || '-'}</span>
                          <span>| Unit: {p.unit}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            p.type === 'service'
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.hsnSacCode || '-'}
                      </td>

                      {/* Prices */}
                      <td className="py-3 px-3 text-right">
                        {p.requiresManualRateVerification ? (
                          <div className="flex flex-col items-end">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 text-[11px]"
                              title={`Imported raw rate: "${p.rawFinalRate || '31KG'}". Requires manual verification.`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{p.rawFinalRate || '31KG'}</span>
                            </span>
                            <button
                              onClick={() => onEditProduct(p)}
                              className="text-[10px] text-amber-600 dark:text-amber-400 underline font-semibold mt-0.5 hover:text-amber-700"
                            >
                              Set Verified Rate
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(p.sellingPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatINR(p.purchasePrice)}
                      </td>

                      {/* GST */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                          {p.gstRate}%
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-3 text-right">
                        {p.type === 'service' ? (
                          <span className="text-slate-400 font-sans text-[11px]">N/A (Service)</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {isLowStock && (
                              <span title={`Low Stock! Threshold: ${p.lowStockThreshold}`}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              </span>
                            )}
                            <span
                              className={`font-bold ${
                                isLowStock
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {p.stockQuantity} {p.unit}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.type === 'product' && (
                            <button
                              onClick={() => onOpenAdjustStock(p)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 text-slate-700 dark:text-slate-300 transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              Adjust Stock
                            </button>
                          )}

                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Catalog Import / Replace Modal */}
      <CustomCatalogReplaceModal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
      />
    </div>
  );
};
