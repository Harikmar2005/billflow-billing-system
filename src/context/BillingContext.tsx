import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  BusinessSettings,
  Customer,
  Product,
  Invoice,
  Payment,
  Expense,
  InventoryMovement,
  DashboardMetrics,
} from '../types';
import { api } from '../services/api';

export type BillingView =
  | 'dashboard'
  | 'invoices'
  | 'create-invoice'
  | 'customers'
  | 'products'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'ai-assistant'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'analytics'
  | 'not-found';

export const VIEW_ROUTES: Record<string, BillingView> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/invoices': 'invoices',
  '/create-invoice': 'create-invoice',
  '/invoices/new': 'create-invoice',
  '/customers': 'customers',
  '/products': 'products',
  '/payments': 'payments',
  '/expenses': 'expenses',
  '/reports': 'reports',
  '/settings': 'settings',
  '/ai-assistant': 'ai-assistant',
  '/privacy-policy': 'privacy-policy',
  '/terms-conditions': 'terms-conditions',
  '/analytics': 'analytics',
};

export const VIEW_PATHS: Record<BillingView, string> = {
  'dashboard': '/',
  'invoices': '/invoices',
  'create-invoice': '/create-invoice',
  'customers': '/customers',
  'products': '/products',
  'payments': '/payments',
  'expenses': '/expenses',
  'reports': '/reports',
  'settings': '/settings',
  'ai-assistant': '/ai-assistant',
  'privacy-policy': '/privacy-policy',
  'terms-conditions': '/terms-conditions',
  'analytics': '/analytics',
  'not-found': '/404',
};

export const VIEW_TITLES: Record<BillingView, string> = {
  'dashboard': 'BillFlow — Smart Billing Software for India',
  'invoices': 'Tax Invoices & History — BillFlow',
  'create-invoice': 'Create GST Tax Invoice — BillFlow',
  'customers': 'Customer Ledger & Balances — BillFlow',
  'products': 'Product Inventory & HSN Catalog — BillFlow',
  'payments': 'Payment Receipts & Collections — BillFlow',
  'expenses': 'Business Expenses & Vouchers — BillFlow',
  'reports': 'GST & Sales Intelligence Reports — BillFlow',
  'settings': 'Business Profile & GST Settings — BillFlow',
  'ai-assistant': 'Smart Billing AI Advisor — BillFlow',
  'privacy-policy': 'Privacy Policy & DPDP Act 2023 — BillFlow',
  'terms-conditions': 'Terms & Conditions of Service — BillFlow',
  'analytics': 'Privacy-Safe Local Analytics — BillFlow',
  'not-found': 'Page Not Found (404) — BillFlow',
};

function getViewFromPath(pathname: string): BillingView {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (normalized in VIEW_ROUTES) {
    return VIEW_ROUTES[normalized];
  }
  return 'not-found';
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface BillingContextType {
  // Navigation
  currentView: BillingView;
  setCurrentView: (view: BillingView) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Data
  settings: BusinessSettings | null;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;

  // Invoice in focus
  previewInvoice: Invoice | null;
  setPreviewInvoice: (inv: Invoice | null) => void;

  // Actions
  refreshAllData: () => Promise<void>;
  updateSettings: (updates: Partial<BusinessSettings>) => Promise<BusinessSettings>;

  // Customer Actions
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; id: string; message?: string }>;
  archiveCustomer: (id: string) => Promise<Customer>;
  unarchiveCustomer: (id: string) => Promise<Customer>;

  // Product Actions
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product> & { rateChangeReason?: string }) => Promise<Product>;
  toggleProductStatus: (id: string, status?: 'active' | 'inactive') => Promise<Product>;
  bulkImportProducts: (
    items: any[],
    updateExisting: boolean
  ) => Promise<{
    success: boolean;
    summary: { totalProcessed: number; added: number; updated: number; skipped: number; failed: number };
    errors: Array<{ row: number; item: string; error: string }>;
  }>;
  replaceProductCatalog: (
    items: any[],
    backupNote?: string
  ) => Promise<{
    success: boolean;
    message: string;
    count: number;
    historicalPreservedCount: number;
    flaggedCount: number;
    backupId: string;
    timestamp: string;
  }>;
  clearAllProducts: (backupNote?: string) => Promise<{
    success: boolean;
    message: string;
    clearedCount: number;
    activeCount: number;
    historicalPreservedCount: number;
    backupId: string;
    timestamp: string;
  }>;
  restoreProductBackup: (backupId?: string) => Promise<{ success: boolean; message: string; count: number }>;
  getProductBackups: () => Promise<Array<{ id: string; timestamp: string; note: string; productCount: number }>>;
  bulkUpdateRates: (data: {
    productIds?: string[];
    category?: string;
    adjustmentType: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  }) => Promise<{ success: boolean; updatedCount: number; items: any[] }>;
  adjustStock: (productId: string, quantityDelta: number, reason: string) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;

  // Invoice Actions
  createInvoice: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  cancelInvoice: (id: string, reason: string) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<{ success: boolean; id: string; invoiceNumber?: string; message?: string }>;

  // Payment Actions
  recordPayment: (data: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
  }) => Promise<void>;

  // Expense Actions
  createExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<BillingView>(() => {
    if (typeof window !== 'undefined') {
      return getViewFromPath(window.location.pathname);
    }
    return 'dashboard';
  });

  const setCurrentView = (view: BillingView) => {
    setCurrentViewState(view);
    const targetPath = VIEW_PATHS[view] || '/';
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
    if (typeof document !== 'undefined') {
      document.title = VIEW_TITLES[view] || 'BillFlow — Smart Billing Software for India';
    }
  };

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('billflow_theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        return true;
      }
      // Default to Light Mode
      localStorage.setItem('billflow_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      return false;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const meta = document.getElementById('theme-meta');
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('billflow_theme', 'dark');
        if (meta) meta.setAttribute('content', '#020617');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('billflow_theme', 'light');
        if (meta) meta.setAttribute('content', '#ffffff');
      }
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const refreshAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        settingsRes,
        customersRes,
        productsRes,
        invoicesRes,
        paymentsRes,
        expensesRes,
        metricsRes,
      ] = await Promise.all([
        api.getSettings(),
        api.getCustomers(),
        api.getProducts(),
        api.getInvoices(),
        api.getPayments(),
        api.getExpenses(),
        api.getDashboardMetrics(),
      ]);

      setSettings(settingsRes);
      setCustomers(customersRes);
      setProducts(Array.isArray(productsRes) ? productsRes : (productsRes && 'items' in productsRes ? productsRes.items : []));
      setInvoices(invoicesRes);
      setPayments(paymentsRes);
      setExpenses(expensesRes);
      setMetrics(metricsRes);
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError(err.message || 'Failed to connect to billing database');
      addToast('Error refreshing data from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();

    if (typeof document !== 'undefined') {
      document.title = VIEW_TITLES[currentView] || 'BillFlow — Smart Billing Software for India';
    }

    const handlePopState = () => {
      const v = getViewFromPath(window.location.pathname);
      setCurrentViewState(v);
      if (typeof document !== 'undefined') {
        document.title = VIEW_TITLES[v] || 'BillFlow — Smart Billing Software for India';
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateSettings = async (updates: Partial<BusinessSettings>) => {
    try {
      const updated = await api.updateSettings(updates);
      setSettings(updated);
      addToast('Business settings saved successfully', 'success');
      return updated;
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings', 'error');
      throw err;
    }
  };

  const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.createCustomer(data);
      setCustomers((prev) => [created, ...prev]);
      addToast(`Customer "${created.name}" added successfully`, 'success');
      refreshAllData();
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to add customer', 'error');
      throw err;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const updated = await api.updateCustomer(id, updates);
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      addToast('Customer details updated', 'success');
      refreshAllData();
      return updated;
    } catch (err: any) {
      addToast(err.message || 'Failed to update customer', 'error');
      throw err;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await api.deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      addToast(res.message || 'Customer deleted successfully', 'success');
      refreshAllData();
      return res;
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      addToast(err.message || 'Failed to delete customer', 'error');
      throw err;
    }
  };

  const archiveCustomer = async (id: string) => {
    try {
      const res = await api.archiveCustomer(id);
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isArchived: true, status: 'archived' } : c))
      );
      addToast(res.message || 'Customer archived successfully', 'success');
      refreshAllData();
      return res.customer;
    } catch (err: any) {
      console.error('Failed to archive customer:', err);
      addToast(err.message || 'Failed to archive customer', 'error');
      throw err;
    }
  };

  const unarchiveCustomer = async (id: string) => {
    try {
      const res = await api.unarchiveCustomer(id);
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isArchived: false, status: 'active' } : c))
      );
      addToast(res.message || 'Customer restored to active', 'success');
      refreshAllData();
      return res.customer;
    } catch (err: any) {
      console.error('Failed to restore customer:', err);
      addToast(err.message || 'Failed to restore customer', 'error');
      throw err;
    }
  };

  const createProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.createProduct(data);
      setProducts((prev) => [created, ...prev]);
      addToast(`Item "${created.name}" added to catalog`, 'success');
      refreshAllData();
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to add item', 'error');
      throw err;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product> & { rateChangeReason?: string }) => {
    try {
      const updated = await api.updateProduct(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      addToast('Product details updated', 'success');
      refreshAllData();
      return updated;
    } catch (err: any) {
      addToast(err.message || 'Failed to update product', 'error');
      throw err;
    }
  };

  const toggleProductStatus = async (id: string, status?: 'active' | 'inactive') => {
    try {
      const updated = await api.toggleProductStatus(id, status);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      addToast(`Item status set to ${updated.status}`, 'info');
      refreshAllData();
      return updated;
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
      throw err;
    }
  };

  const bulkImportProducts = async (items: any[], updateExisting: boolean) => {
    try {
      const res = await api.bulkImportProducts(items, updateExisting);
      addToast(
        `Import completed: ${res.summary.added} added, ${res.summary.updated} updated, ${res.summary.skipped} skipped`,
        'success'
      );
      refreshAllData();
      return res;
    } catch (err: any) {
      addToast(err.message || 'Import failed', 'error');
      throw err;
    }
  };

  const replaceProductCatalog = async (items: any[], backupNote?: string) => {
    try {
      const res = await api.replaceCatalog(items, backupNote);
      addToast(
        `Catalog replaced: ${res.count} items imported${res.flaggedCount > 0 ? ` (${res.flaggedCount} flagged for review)` : ''}`,
        'success'
      );
      refreshAllData();
      return res;
    } catch (err: any) {
      addToast(err.message || 'Failed to replace catalog', 'error');
      throw err;
    }
  };

  const clearAllProducts = async (backupNote?: string) => {
    try {
      const res = await api.clearAllProducts(backupNote);
      setProducts([]);
      addToast(
        `Catalog cleared: ${res.clearedCount} default items removed. Inventory is empty and ready for import.`,
        'success'
      );
      await refreshAllData();
      return res;
    } catch (err: any) {
      addToast(err.message || 'Failed to clear inventory', 'error');
      throw err;
    }
  };

  const restoreProductBackup = async (backupId?: string) => {
    try {
      const res = await api.restoreProductBackup(backupId);
      addToast(`Restored inventory: ${res.count} items recovered`, 'success');
      refreshAllData();
      return res;
    } catch (err: any) {
      addToast(err.message || 'Failed to restore backup', 'error');
      throw err;
    }
  };

  const getProductBackups = async () => {
    try {
      return await api.getProductBackups();
    } catch (err: any) {
      console.error('Failed to get backups:', err);
      return [];
    }
  };

  const bulkUpdateRates = async (data: {
    productIds?: string[];
    category?: string;
    adjustmentType: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  }) => {
    try {
      const res = await api.bulkUpdateRates(data);
      addToast(`Updated rates for ${res.updatedCount} items`, 'success');
      refreshAllData();
      return res;
    } catch (err: any) {
      addToast(err.message || 'Bulk rate update failed', 'error');
      throw err;
    }
  };

  const adjustStock = async (productId: string, quantityDelta: number, reason: string) => {
    try {
      const updated = await api.adjustStock(productId, quantityDelta, reason);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      addToast(`Stock adjusted (${quantityDelta > 0 ? '+' : ''}${quantityDelta})`, 'success');
      refreshAllData();
      return updated;
    } catch (err: any) {
      addToast(err.message || 'Failed to adjust stock', 'error');
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      addToast('Product removed from catalog', 'info');
      refreshAllData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete product', 'error');
      throw err;
    }
  };

  const createInvoice = async (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.createInvoice(data);
      setInvoices((prev) => [created, ...prev]);
      addToast(`Tax Invoice ${created.invoiceNumber} issued successfully`, 'success');
      refreshAllData();
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to generate invoice', 'error');
      throw err;
    }
  };

  const cancelInvoice = async (id: string, reason: string) => {
    try {
      const cancelled = await api.cancelInvoice(id, reason);
      setInvoices((prev) => prev.map((i) => (i.id === id ? cancelled : i)));
      addToast(`Invoice ${cancelled.invoiceNumber} cancelled & stock restored`, 'info');
      refreshAllData();
      return cancelled;
    } catch (err: any) {
      addToast(err.message || 'Failed to cancel invoice', 'error');
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const res = await api.deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      if (previewInvoice?.id === id) {
        setPreviewInvoice(null);
      }
      addToast(res.message || 'Invoice deleted successfully', 'success');
      await refreshAllData();
      return res;
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      addToast(err.message || 'Failed to delete invoice', 'error');
      throw err;
    }
  };

  const recordPayment = async (data: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
  }) => {
    try {
      await api.recordPayment(data);
      addToast(`Payment of ₹${data.amount.toLocaleString('en-IN')} recorded`, 'success');
      refreshAllData();
    } catch (err: any) {
      addToast(err.message || 'Failed to record payment', 'error');
      throw err;
    }
  };

  const createExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const created = await api.createExpense(data);
      setExpenses((prev) => [created, ...prev]);
      addToast(`Expense of ₹${data.amount.toLocaleString('en-IN')} recorded`, 'success');
      refreshAllData();
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to record expense', 'error');
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      addToast('Expense deleted', 'info');
      refreshAllData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete expense', 'error');
      throw err;
    }
  };

  return (
    <BillingContext.Provider
      value={{
        currentView,
        setCurrentView,
        searchQuery,
        setSearchQuery,
        isDark,
        toggleTheme,
        settings,
        customers,
        products,
        invoices,
        payments,
        expenses,
        metrics,
        loading,
        error,
        previewInvoice,
        setPreviewInvoice,
        refreshAllData,
        updateSettings,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        archiveCustomer,
        unarchiveCustomer,
        createProduct,
        updateProduct,
        toggleProductStatus,
        bulkImportProducts,
        replaceProductCatalog,
        clearAllProducts,
        restoreProductBackup,
        getProductBackups,
        bulkUpdateRates,
        adjustStock,
        deleteProduct,
        createInvoice,
        cancelInvoice,
        deleteInvoice,
        recordPayment,
        createExpense,
        deleteExpense,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within BillingProvider');
  }
  return context;
};
