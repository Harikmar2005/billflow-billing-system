import React, { useState } from 'react';
import { useBilling, BillingView } from '../../context/BillingContext';
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  Users,
  Package,
  CreditCard,
  Receipt,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Activity,
  Shield,
  Scale
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    invoices,
    customers,
    products,
    metrics,
    settings,
  } = useBilling();

  const [collapsed, setCollapsed] = useState<boolean>(false);

  const overdueCount = metrics?.overdueCount || 0;
  const lowStockCount = metrics?.lowStockCount || 0;

  const navItems: Array<{
    id: BillingView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileText,
      badge: overdueCount > 0 ? `${overdueCount} due` : invoices.length,
      badgeColor:
        overdueCount > 0
          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
    {
      id: 'create-invoice',
      label: 'New Invoice',
      icon: FilePlus2,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: customers.length,
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
    {
      id: 'products',
      label: 'Inventory & Items',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : products.length,
      badgeColor:
        lowStockCount > 0
          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
    {
      id: 'payments',
      label: 'Payments Received',
      icon: CreditCard,
    },
    {
      id: 'expenses',
      label: 'Expense Tracker',
      icon: Receipt,
    },
    {
      id: 'reports',
      label: 'GST & Sales Reports',
      icon: BarChart3,
    },
    {
      id: 'analytics',
      label: 'Privacy Analytics',
      icon: Activity,
      badge: 'Local',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold',
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-semibold',
    },
    {
      id: 'settings',
      label: 'Business Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] sticky top-14 border-r border-[#E2E8F0] bg-white flex flex-col justify-between transition-all duration-200 z-20 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Top Nav List */}
      <div className="p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#009688]' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#009688] rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Business Card & Collapse Toggle */}
      <div className="p-2 border-t border-[#E2E8F0] space-y-2">
        {!collapsed && settings && (
          <div className="p-2 rounded-md bg-slate-50 border border-[#E2E8F0] text-[11px]">
            <div className="flex items-center justify-between text-slate-400 mb-0.5 font-mono text-[10px]">
              <span>REGISTERED GSTIN</span>
              <span className="text-[#009688] font-bold">{settings.stateCode}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-700 font-semibold truncate">
              {settings.gstin || 'GST Unregistered'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {settings.city}, {settings.state}
            </div>

            {/* Quick Legal Links */}
            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <button
                onClick={() => setCurrentView('privacy-policy')}
                className="hover:text-[#009688] hover:underline"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                onClick={() => setCurrentView('terms-conditions')}
                className="hover:text-[#009688] hover:underline"
              >
                Terms
              </button>
              <span>•</span>
              <button
                onClick={() => setCurrentView('analytics')}
                className="hover:text-[#009688] hover:underline"
              >
                Metrics
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
