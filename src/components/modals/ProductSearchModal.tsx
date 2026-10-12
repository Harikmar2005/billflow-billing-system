import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../../types';
import { formatINR } from '../../utils/billing';
import {
  Search,
  X,
  Package,
  Check,
  Tag,
  Hash,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  products: Product[];
  currentProductId?: string;
  rowIndex?: number;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  products,
  currentProductId,
  rowIndex,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmedSearchTerm, setConfirmedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus and reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setConfirmedSearchTerm('');
      setSelectedCategory('all');
      setInStockOnly(false);
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products by search term, category, and stock
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((p) => {
      // Status filter: only active products (or all if not specified)
      if (p.status === 'inactive') return false;

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // In stock filter
      if (inStockOnly && p.type === 'product' && (p.stockQuantity || 0) <= 0) {
        return false;
      }

      // If no search query, match all
      if (!query) return true;

      // Multi-field search: Name, Item Code (SKU), HSN/SAC code, Category, Description
      const nameMatch = (p.name || '').toLowerCase().includes(query);
      const skuMatch = (p.sku || '').toLowerCase().includes(query);
      const hsnMatch = (p.hsnSacCode || '').toLowerCase().includes(query);
      const descMatch = (p.description || '').toLowerCase().includes(query);
      const catMatch = (p.category || '').toLowerCase().includes(query);

      return nameMatch || skuMatch || hsnMatch || descMatch || catMatch;
    });
  }, [products, searchTerm, selectedCategory, inStockOnly]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts.length, searchTerm]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < Math.min(filteredProducts.length - 1, 99) ? prev + 1 : 0
        );
        scrollHighlightedIntoView(highlightedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : Math.min(filteredProducts.length - 1, 99)
        );
        scrollHighlightedIntoView(highlightedIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredProducts, highlightedIndex, onClose]);

  const scrollHighlightedIntoView = (index: number) => {
    if (!listContainerRef.current) return;
    const cards = listContainerRef.current.querySelectorAll('.product-result-card');
    if (cards[index]) {
      cards[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
  };

  const handleExplicitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConfirmedSearchTerm(searchTerm);
    if (filteredProducts.length > 0 && highlightedIndex < filteredProducts.length) {
      // If user hit Enter and has an active search result, select the top/highlighted item
      handleSelect(filteredProducts[highlightedIndex]);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExplicitSearch();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-search-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="product-search-title"
                  className="font-bold text-sm text-slate-900 dark:text-slate-100"
                >
                  Search Products & Item Master
                </h2>
                {rowIndex !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Row #{rowIndex + 1}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Search catalogue by item name, SKU code, HSN code, or description ({products.length} items available)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Bar Section */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 space-y-3">
          <form onSubmit={handleExplicitSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search by product name, item code (SKU), HSN code, description..."
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs sm:text-sm font-medium transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Explicit Search Button */}
            <button
              type="submit"
              className="px-4 py-2 flex items-center justify-center gap-1.5 font-semibold text-xs sm:text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white border border-teal-500 shadow-sm transition-colors shrink-0 focus:outline-hidden focus:ring-2 focus:ring-teal-400 active:scale-98"
              title="Search Products"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          {/* Filters & Results Stats */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3 h-3 text-teal-500" />
                Category:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Items ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-teal-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* In stock toggle */}
            <div className="flex items-center gap-3 ml-auto">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500"
                />
                <span>In Stock Only</span>
              </label>
              <span className="text-slate-400 font-mono">
                {filteredProducts.length} match{filteredProducts.length === 1 ? '' : 'es'}
              </span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y-0 min-h-[300px] max-h-[58vh]"
        >
          {filteredProducts.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No products found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? `We couldn't find any items matching "${searchTerm}". Try checking for spelling errors, searching by SKU/Item Code, or HSN code.`
                  : 'No items match the selected filter criteria.'}
              </p>
              {(searchTerm || selectedCategory !== 'all' || inStockOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setInStockOnly(false);
                    searchInputRef.current?.focus();
                  }}
                  className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                  Clear Filters & Search
                </button>
              )}
            </div>
          ) : (
            filteredProducts.slice(0, 100).map((product, idx) => {
              const isSelected = product.id === currentProductId;
              const isHighlighted = idx === highlightedIndex;

              const isLowStock =
                product.type === 'product' &&
                product.stockQuantity <= (product.lowStockThreshold || 5) &&
                product.stockQuantity > 0;
              const isOutOfStock =
                product.type === 'product' && product.stockQuantity <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`product-result-card group p-3 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHighlighted
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-xs'
                      : isSelected
                      ? 'border-teal-500/50 bg-slate-50 dark:bg-slate-800/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {product.name}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                          <Check className="w-3 h-3" /> Selected in Row
                        </span>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {product.description}
                      </p>
                    )}

                    {/* Metadata Pills: SKU, HSN, Category, Stock */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[10px]">
                      {/* Item Code / SKU */}
                      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        SKU: {product.sku}
                      </span>

                      {/* HSN Code */}
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5 text-slate-400" />
                        HSN: {product.hsnSacCode || '-'}
                      </span>

                      {/* Category */}
                      {product.category && (
                        <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-medium">
                          {product.category}
                        </span>
                      )}

                      {/* Available Stock */}
                      {product.type === 'product' ? (
                        <span
                          className={`px-2 py-0.5 rounded font-semibold border ${
                            isOutOfStock
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isLowStock
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 flex items-center gap-1'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="w-2.5 h-2.5" />}
                          Stock: {product.stockQuantity} {product.unit}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold">
                          Service
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Rate, GST, Select Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="font-mono font-bold text-sm sm:text-base text-teal-600 dark:text-teal-400">
                        {formatINR(product.sellingPrice)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        per {product.unit} • <span className="text-teal-700 dark:text-teal-300 font-semibold">{product.gstRate}% GST</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(product);
                      }}
                      className="px-3 py-1.5 flex items-center gap-1 rounded-md font-semibold text-xs bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-transform active:scale-95"
                    >
                      <span>Select Item</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {filteredProducts.length > 100 && (
            <div className="py-2 text-center text-[11px] text-slate-400 font-mono">
              Showing top 100 of {filteredProducts.length} matching items. Refine your search to see more specific results.
            </div>
          )}
        </div>

        {/* Footer / Shortcut Info */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px]">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px]">
                Enter
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>

          <div className="font-medium text-teal-600 dark:text-teal-400">
            Selected product will automatically populate item row & focus quantity
          </div>
        </div>
      </div>
    </div>
  );
};
