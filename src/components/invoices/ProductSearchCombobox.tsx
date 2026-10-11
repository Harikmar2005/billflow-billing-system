import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../../types';
import { formatINR } from '../../utils/billing';
import { Search, Tag, Check, Package, X, ChevronDown, Sparkles } from 'lucide-react';

interface ProductSearchComboboxProps {
  products: Product[];
  selectedProductId: string;
  selectedProductName: string;
  onSelectProduct: (product: Product) => void;
  onCustomNameChange: (name: string) => void;
  placeholder?: string;
}

export const ProductSearchCombobox: React.FC<ProductSearchComboboxProps> = ({
  products,
  selectedProductId,
  selectedProductName,
  onSelectProduct,
  onCustomNameChange,
  placeholder = 'Search by item name, SKU code, or HSN...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedProductName || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync internal searchTerm when external selectedProductName changes
  useEffect(() => {
    setSearchTerm(selectedProductName || '');
  }, [selectedProductName]);

  // Filter active products efficiently
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const activeList = products.filter((p) => (p.status || 'active') === 'active');

    if (!q) {
      // If empty, show first 15 products
      return activeList.slice(0, 15);
    }

    return activeList
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.hsnSacCode && p.hsnSacCode.includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      })
      .slice(0, 20); // Cap to 20 for instant rendering speed
  }, [products, searchTerm]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prod: Product) => {
    onSelectProduct(prod);
    setSearchTerm(prod.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onCustomNameChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      );
      // Auto-scroll list
      scrollIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      );
      scrollIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Input container */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-7 pr-7 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-medium"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />

        {searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              onCustomNameChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear item name"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          />
        )}
      </div>

      {/* Selected SKU badge pill if selected from catalogue */}
      {selectedProduct && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-mono font-semibold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {selectedProduct.sku}
          </span>
          {selectedProduct.category && (
            <span className="px-1 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50">
              {selectedProduct.category}
            </span>
          )}
          <span className="text-teal-600 dark:text-teal-400 font-semibold">
            Catalog Rate: {formatINR(selectedProduct.sellingPrice)}/{selectedProduct.unit}
          </span>
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
            <span>
              Item Master Catalogue ({filteredProducts.length} matching)
            </span>
            <span className="text-slate-400">↑↓ to navigate, Enter to pick</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-slate-400">
              <p>No catalogue items found for "{searchTerm}"</p>
              <p className="text-[10px] text-slate-500 mt-1">
                You can keep typing to bill as a custom line item.
              </p>
            </div>
          ) : (
            <ul ref={listRef} className="py-0.5">
              {filteredProducts.map((p, idx) => {
                const isSelected = p.id === selectedProductId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-2 cursor-pointer flex items-start justify-between gap-3 transition-colors ${
                      isHighlighted
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-100'
                        : isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {p.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                        <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                          {p.sku}
                        </span>
                        <span>•</span>
                        <span>HSN: {p.hsnSacCode || '-'}</span>
                        {p.category && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{p.category}</span>
                          </>
                        )}
                        {p.type === 'product' && (
                          <>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                p.stockQuantity <= (p.lowStockThreshold || 5)
                                  ? 'text-amber-500'
                                  : 'text-slate-500'
                              }`}
                            >
                              Stock: {p.stockQuantity} {p.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-teal-700 dark:text-teal-400">
                        {formatINR(p.sellingPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        per {p.unit} ({p.gstRate}% GST)
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
