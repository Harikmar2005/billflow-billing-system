import React from 'react';
import { useBilling } from '../../context/BillingContext';
import {
  Search,
  Plus,
  Sun,
  Moon,
  Building2,
  RefreshCw,
  AlertCircle,
  PackageX,
  Sparkles,
  FileText
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    settings,
    metrics,
    searchQuery,
    setSearchQuery,
    isDark,
    toggleTheme,
    setCurrentView,
    refreshAllData,
    loading,
  } = useBilling();

  const overdueCount = metrics?.overdueCount || 0;
  const lowStockCount = metrics?.lowStockCount || 0;

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Brand & Business Info */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-teal-700 transition-colors">
            ₹
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1">
              BillFlow
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                India GST
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Current Business Identity */}
        <div
          onClick={() => setCurrentView('settings')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors max-w-xs truncate"
          title="Click to view/edit business settings"
        >
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">{settings?.businessName || 'Configure Business'}</span>
          {settings?.state && (
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
              ({settings.state})
            </span>
          )}
        </div>
      </div>

      {/* Center: Global Search Input */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, GSTIN, phone, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions, Alerts, and Theme */}
      <div className="flex items-center gap-2">
        {/* Overdue alert indicator */}
        {overdueCount > 0 && (
          <button
            onClick={() => setCurrentView('invoices')}
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
            title={`${overdueCount} overdue invoices pending payment`}
          >
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>{overdueCount} Overdue</span>
          </button>
        )}

        {/* Low stock alert indicator */}
        {lowStockCount > 0 && (
          <button
            onClick={() => setCurrentView('products')}
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            title={`${lowStockCount} items running low on stock`}
          >
            <PackageX className="w-3 h-3 text-amber-500" />
            <span>{lowStockCount} Low Stock</span>
          </button>
        )}

        {/* Refresh Sync */}
        <button
          onClick={() => refreshAllData()}
          disabled={loading}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          onClick={() => setCurrentView('ai-assistant')}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          <span>Ask AI</span>
        </button>

        {/* Primary Create Invoice Button */}
        <button
          onClick={() => setCurrentView('create-invoice')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Invoice</span>
        </button>
      </div>
    </header>
  );
};
