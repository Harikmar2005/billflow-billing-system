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
  AlertCircle,
  ShieldCheck,
  Loader2
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
    clearAllProducts,
    searchQuery,
  } = useBilling();

  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service' | 'needs_review'>('all');
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const activeProducts = products.filter((p) => p.status !== 'archived');
  const unverifiedCount = activeProducts.filter((p) => p.requiresManualRateVerification || p.isIncomplete).length;

  const filteredProducts = activeProducts.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.hsnSacCode && p.hsnSacCode.includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.sno && String(p.sno).includes(q));

    let matchesType = true;
    if (typeFilter === 'product') matchesType = p.type === 'product';
    else if (typeFilter === 'service') matchesType = p.type === 'service';
    else if (typeFilter === 'needs_review') matchesType = !!(p.requiresManualRateVerification || p.isIncomplete);

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete item "${name}" from catalog?`)) {
      await deleteProduct(id);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      setIsClearing(true);
      await clearAllProducts('User confirmed bulk clearing of default inventory items');
      setIsClearModalOpen(false);
    } catch (err) {
      console.error('Failed to clear inventory:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
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
          {/* Destructive Clear All Inventory Button */}
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 active:scale-[0.98]"
            title="Clear All Inventory Items from Catalog"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Clear All Items</span>
          </button>

          <button
            onClick={() => setIsReplaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-teal-600 text-teal-700 hover:bg-teal-50 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-[0.98]"
            title="Import Product List (S.NO, DESCRIPTION, Final Rate)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import / Replace Catalog</span>
          </button>

          <button
            onClick={onOpenCreateProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#009688] hover:bg-[#00796B] text-white shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/30 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Flagged Item Review Banner */}
      {unverifiedCount > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold">{unverifiedCount} item(s) require manual rate review</span>
              <p className="text-[11px] text-amber-700 mt-0.5">
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
      <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit text-xs font-semibold">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Items ({products.filter((p) => p.status !== 'archived').length})
        </button>
        <button
          onClick={() => setTypeFilter('product')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'product'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Physical Products ({products.filter((p) => p.type === 'product' && p.status !== 'archived').length})
        </button>
        <button
          onClick={() => setTypeFilter('service')}
          className={`px-3 py-1 rounded-md transition-colors ${
            typeFilter === 'service'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Services ({products.filter((p) => p.type === 'service' && p.status !== 'archived').length})
        </button>
        {unverifiedCount > 0 && (
          <button
            onClick={() => setTypeFilter('needs_review')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              typeFilter === 'needs_review'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-100/60'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Review ({unverifiedCount})</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            {activeProducts.length === 0 ? (
              <>
                <h3 className="font-bold text-sm text-slate-800">Catalog is empty (0 items)</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  All default inventory items have been removed. Your catalog is clean and ready for your own product list.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsReplaceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-semibold shadow-2xs transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Product List</span>
                  </button>
                  <button
                    onClick={onOpenCreateProduct}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#009688] hover:bg-[#00796B] text-white font-semibold text-xs shadow-2xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-600">No products or services found.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                <button
                  onClick={onOpenCreateProduct}
                  className="mt-3 px-3 py-1.5 rounded-md bg-[#009688] text-white font-semibold text-xs"
                >
                  Add Item
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-[#F1F5F9] text-slate-700 font-semibold font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">ITEM NAME &amp; SKU</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">HSN/SAC</th>
                  <th className="py-3 px-3 text-right">SELLING PRICE</th>
                  <th className="py-3 px-3 text-right">COST PRICE</th>
                  <th className="py-3 px-3 text-center">GST RATE</th>
                  <th className="py-3 px-3 text-right">STOCK ON HAND</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredProducts.map((p) => {
                  const isLowStock = p.type === 'product' && p.stockQuantity <= p.lowStockThreshold;

                  return (
                    <tr key={p.id} className={`bg-white even:bg-[#F8FAFC] hover:bg-slate-100/70 transition-colors ${
                      p.requiresManualRateVerification ? 'bg-amber-50/40' : ''
                    }`}>
                      {/* Name & SKU & S.NO */}
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {p.requiresManualRateVerification && (
                            <span className="p-0.5 rounded bg-amber-500/20 text-amber-500" title="Non-numeric rate needs verification">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span>{p.name}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {p.sno && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold text-[10px] border border-slate-200">
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
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-3 px-3 text-slate-600">
                        {p.hsnSacCode || '-'}
                      </td>

                      {/* Prices */}
                      <td className="py-3 px-3 text-right">
                        {p.requiresManualRateVerification ? (
                          <div className="flex flex-col items-end">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-300 text-[11px]"
                              title={`Imported raw rate: "${p.rawFinalRate || '31KG'}". Requires manual verification.`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{p.rawFinalRate || '31KG'}</span>
                            </span>
                            <button
                              onClick={() => onEditProduct(p)}
                              className="text-[10px] text-amber-700 underline font-semibold mt-0.5 hover:text-amber-800"
                            >
                              Set Verified Rate
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {formatINR(p.sellingPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatINR(p.purchasePrice)}
                      </td>

                      {/* GST */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
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
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
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
                              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              Adjust Stock
                            </button>
                          )}

                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
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

      {/* Clear All Inventory Confirmation Dialog */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-left">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Clear All Inventory Items?
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  This will remove all existing default inventory items from your catalog. This action may affect invoice creation and stock records. Make sure you have backed up your inventory before continuing.
                </p>

                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Automatic snapshot backup will be created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Existing invoices, customers, and payments remain 100% safe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Items referenced in historical invoices are safely archived</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={isClearing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Items...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Items</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
