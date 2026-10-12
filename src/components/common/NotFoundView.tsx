import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { FileQuestion, ArrowLeft, Home, FileText, Package, Settings, Search } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const { setCurrentView } = useBilling();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center mb-4 shadow-inner">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="font-mono text-3xl font-extrabold text-teal-600 dark:text-teal-400 tracking-wider mb-1">
        404
      </div>

      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Page or Invoice Record Not Found
      </h1>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
        The view or record you are trying to access does not exist or may have been relocated. Use the navigation shortcuts below to return to your billing workflows.
      </p>

      {/* Primary Return CTA */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-4 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm flex items-center gap-2 text-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentView('create-invoice')}
          className="px-4 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-teal-500" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Quick Links Card */}
      <div className="w-full max-w-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-left shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          Quick Workspaces
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrentView('invoices')}
            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            <span>All Invoices</span>
          </button>
          <button
            onClick={() => setCurrentView('products')}
            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs"
          >
            <Package className="w-3.5 h-3.5 text-teal-500" />
            <span>Product Catalog</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs"
          >
            <Settings className="w-3.5 h-3.5 text-teal-500" />
            <span>Business Settings</span>
          </button>
          <button
            onClick={() => setCurrentView('privacy-policy')}
            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs"
          >
            <span className="text-teal-500">🔒</span>
            <span>Privacy Policy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
