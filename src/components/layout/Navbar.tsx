import React, { useState } from 'react';
import { useBilling, BillingView } from '../../context/BillingContext';
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
  FileText,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  Activity,
  Shield,
  Scale
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    settings,
    metrics,
    searchQuery,
    setSearchQuery,
    isDark,
    toggleTheme,
    currentView,
    setCurrentView,
    refreshAllData,
    loading,
  } = useBilling();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const overdueCount = metrics?.overdueCount || 0;
  const lowStockCount = metrics?.lowStockCount || 0;

  const mobileNavItems: Array<{ id: BillingView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'create-invoice', label: 'Create New Invoice', icon: Plus },
    { id: 'customers', label: 'Customers Ledger', icon: Users },
    { id: 'products', label: 'Product Inventory', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'analytics', label: 'Privacy Analytics', icon: Activity },
    { id: 'ai-assistant', label: 'AI Advisor', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
    { id: 'terms-conditions', label: 'Terms & Conditions', icon: Scale },
  ];

  return (
    <>
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 transition-colors">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Open Navigation Menu"
            aria-label="Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

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
                aria-label="Clear Search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions, Alerts, and Primary Call to Action */}
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
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark/Light Mode"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Clear Call To Action Button (Primary CTA) */}
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 active:scale-95 transition-all ring-1 ring-teal-400/40"
            title="Create New Invoice (Shortcut: Ctrl+N)"
            aria-label="Create New Invoice"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Invoice</span>
            <kbd className="hidden xl:inline-block ml-0.5 px-1 py-0.2 text-[9px] font-mono bg-teal-700/80 text-teal-100 rounded border border-teal-500/40">
              Ctrl+N
            </kbd>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Modal */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex md:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-4 text-xs animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">BillFlow Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 flex-1 overflow-y-auto space-y-1">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>BillFlow India GST 2026-27</div>
              <div className="text-[10px]">🔒 100% Client-Safe Privacy</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

