import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Product, GST_RATES, PRODUCT_UNITS } from '../../types';
import { X, Package, Tag, IndianRupee, Layers } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { createProduct, updateProduct, addToast } = useBilling();

  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [sku, setSku] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    setErrors({});
    setHoneypot('');
    if (productToEdit) {
      setName(productToEdit.name);
      setType(productToEdit.type || 'product');
      setSku(productToEdit.sku || '');
      setHsnSacCode(productToEdit.hsnSacCode || '');
      setUnit(productToEdit.unit || 'Pcs');
      setSellingPrice(productToEdit.sellingPrice || 0);
      setPurchasePrice(productToEdit.purchasePrice || 0);
      setGstRate(productToEdit.gstRate ?? 18);
      setStockQuantity(productToEdit.stockQuantity || 0);
      setLowStockThreshold(productToEdit.lowStockThreshold ?? 5);
      setDescription(productToEdit.description || '');
    } else {
      setName('');
      setType('product');
      setSku('');
      setHsnSacCode('');
      setUnit('Pcs');
      setSellingPrice(0);
      setPurchasePrice(0);
      setGstRate(18);
      setStockQuantity(10);
      setLowStockThreshold(5);
      setDescription('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot.trim()) {
      console.warn('Bot detected via honeypot');
      onClose();
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Item or service name must be at least 2 characters long';
    }

    if (isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      newErrors.sellingPrice = 'Selling price must be a valid positive number';
    }

    if (isNaN(Number(purchasePrice)) || Number(purchasePrice) < 0) {
      newErrors.purchasePrice = 'Purchase price cannot be negative';
    }

    if (type === 'product' && (isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0)) {
      newErrors.stockQuantity = 'Stock quantity cannot be negative';
    }

    if (hsnSacCode.trim() && !/^[0-9a-zA-Z]{2,10}$/.test(hsnSacCode.trim())) {
      newErrors.hsnSacCode = 'HSN/SAC code should be 2 to 8 alphanumeric characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast(Object.values(newErrors)[0], 'error');
      return;
    }

    setErrors({});

    try {
      setSubmitting(true);
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: name.trim(),
          type,
          sku: sku.trim(),
          hsnSacCode: hsnSacCode.trim(),
          unit,
          sellingPrice: Number(sellingPrice),
          purchasePrice: Number(purchasePrice),
          gstRate: Number(gstRate),
          stockQuantity: type === 'product' ? Number(stockQuantity) : 0,
          lowStockThreshold: type === 'product' ? Number(lowStockThreshold) : 0,
          description: description.trim(),
        });
      } else {
        await createProduct({
          name: name.trim(),
          type,
          sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          hsnSacCode: hsnSacCode.trim(),
          unit,
          sellingPrice: Number(sellingPrice),
          purchasePrice: Number(purchasePrice),
          gstRate: Number(gstRate),
          stockQuantity: type === 'product' ? Number(stockQuantity) : 0,
          lowStockThreshold: type === 'product' ? Number(lowStockThreshold) : 0,
          description: description.trim(),
          status: 'active',
        });
      }
      onClose();
    } catch {
      // Handled in context
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
            <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {productToEdit ? 'Edit Product / Service' : 'Add Item to Inventory / Catalog'}
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
          {/* Honeypot field for bot/spam protection */}
          <input
            type="text"
            name="hp_field"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden opacity-0 h-0 w-0 absolute pointer-events-none"
            aria-hidden="true"
          />

          {/* Item Type Switch */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType('product');
                if (unit === 'Hours') setUnit('Pcs');
              }}
              className={`flex-1 py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                type === 'product'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              📦 Physical Goods / Product
            </button>
            <button
              type="button"
              onClick={() => {
                setType('service');
                setUnit('Hours');
              }}
              className={`flex-1 py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                type === 'service'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              💼 Professional Service / Labor
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {type === 'product' ? 'Product Name' : 'Service Description'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder={type === 'product' ? 'e.g. Cat6 Ethernet Cable 305m Drum' : 'e.g. Network Cabling & Server Setup'}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none transition-colors ${
                errors.name
                  ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
              }`}
            />
            {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* SKU & HSN/SAC Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item SKU / Part Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CAB-CAT6-305"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {type === 'product' ? 'HSN Code (Goods)' : 'SAC Code (Services)'}
              </label>
              <input
                type="text"
                maxLength={8}
                value={hsnSacCode}
                onChange={(e) => {
                  setHsnSacCode(e.target.value);
                  if (errors.hsnSacCode) setErrors((prev) => ({ ...prev, hsnSacCode: '' }));
                }}
                placeholder={type === 'product' ? 'e.g. 8544' : 'e.g. 9983'}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none font-mono ${
                  errors.hsnSacCode
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                }`}
              />
              {errors.hsnSacCode && <p className="text-[10px] text-rose-500 mt-1">{errors.hsnSacCode}</p>}
            </div>
          </div>

          {/* Pricing & GST */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => {
                    setSellingPrice(parseFloat(e.target.value) || 0);
                    if (errors.sellingPrice) setErrors((prev) => ({ ...prev, sellingPrice: '' }));
                  }}
                  className={`w-full pl-7 pr-3 py-1.5 rounded border bg-white dark:bg-slate-900 focus:outline-none font-mono font-semibold ${
                    errors.sellingPrice
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                  }`}
                />
              </div>
              {errors.sellingPrice && <p className="text-[10px] text-rose-500 mt-1">{errors.sellingPrice}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Cost (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => {
                    setPurchasePrice(parseFloat(e.target.value) || 0);
                    if (errors.purchasePrice) setErrors((prev) => ({ ...prev, purchasePrice: '' }));
                  }}
                  className={`w-full pl-7 pr-3 py-1.5 rounded border bg-white dark:bg-slate-900 focus:outline-none font-mono ${
                    errors.purchasePrice
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                  }`}
                />
              </div>
              {errors.purchasePrice && <p className="text-[10px] text-rose-500 mt-1">{errors.purchasePrice}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GST Rate Slab
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-teal-500 focus:outline-none font-semibold text-teal-700 dark:text-teal-400"
              >
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}% GST
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Inventory Track */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Measurement Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {type === 'product' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Alert At
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item Specification / Description (shown on invoice)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High speed pure copper cable with RJ45 boots..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Modal Actions */}
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
              {submitting ? 'Saving...' : productToEdit ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
