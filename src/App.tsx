import React, { useState, useEffect } from 'react';
import { BillingProvider, useBilling } from './context/BillingContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { analytics } from './utils/analytics';

// Main Views
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoiceListView } from './components/invoices/InvoiceListView';
import { CreateInvoiceView } from './components/invoices/CreateInvoiceView';
import { CustomerListView } from './components/customers/CustomerListView';
import { ProductListView } from './components/products/ProductListView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { AiAssistantView } from './components/assistant/AiAssistantView';
import { PrivacyPolicyView } from './components/legal/PrivacyPolicyView';
import { TermsConditionsView } from './components/legal/TermsConditionsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { NotFoundView } from './components/common/NotFoundView';

// Modals
import { CustomerModal } from './components/modals/CustomerModal';
import { ProductModal } from './components/modals/ProductModal';
import { AdjustStockModal } from './components/modals/AdjustStockModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { CancelInvoiceModal } from './components/modals/CancelInvoiceModal';
import { DeleteInvoiceModal } from './components/modals/DeleteInvoiceModal';
import { InvoicePreviewModal } from './components/invoices/InvoicePreviewModal';
import { AuthModal } from './components/modals/AuthModal';

import { Customer, Product, Invoice } from './types';
import { Shield, Lock, AlertTriangle, RefreshCw } from 'lucide-react';

const BillingApp: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    loading,
    error,
    refreshAllData,
    previewInvoice,
    setPreviewInvoice,
    invoices,
    authStatus,
    connectionError,
    checkAuthStatus,
  } = useBilling();

  // Track page view event on navigation
  useEffect(() => {
    analytics.track(`View: ${currentView}`, 'navigation');
  }, [currentView]);

  // Global Keyboard Shortcut: Ctrl+N or Cmd+N to create new invoice (Clear CTA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentView('create-invoice');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView]);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  const [isCancelInvoiceModalOpen, setIsCancelInvoiceModalOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);

  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const handleOpenDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteInvoiceModalOpen(true);
  };

  // Customer handlers
  const handleOpenCreateCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  // Product handlers
  const handleOpenCreateProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleOpenAdjustStock = (product: Product) => {
    setProductToAdjust(product);
    setIsAdjustStockModalOpen(true);
  };

  // Payment handler
  const handleOpenRecordPayment = (invoice?: Invoice) => {
    if (invoice) {
      setInvoiceForPayment(invoice);
    } else {
      // Find first unpaid or partly paid invoice
      const unpaid = invoices.find(
        (i) => i.status !== 'cancelled' && (i.paymentStatus === 'unpaid' || i.paymentStatus === 'partially_paid')
      );
      setInvoiceForPayment(unpaid || invoices[0] || null);
    }
    setIsRecordPaymentModalOpen(true);
  };

  // Cancel invoice handler
  const handleOpenCancelInvoice = (invoice: Invoice) => {
    setInvoiceToCancel(invoice);
    setIsCancelInvoiceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-200">
          {/* Database & Server Connection Error Banner */}
          {authStatus === 'connection_error' && (
            <div className="mb-6 p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 text-xs shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-rose-900 dark:text-rose-100">
                      Cannot Connect to BillFlow Backend Server
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                      {connectionError || 'Backend server on http://0.0.0.0:3000 is not reachable.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => checkAuthStatus()}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Retrying...' : 'Retry Connection'}</span>
                </button>
              </div>
            </div>
          )}

          {/* General Database Error Banner (Filtered from raw setup prompt) */}
          {error && !error.includes('Initial system setup required') && authStatus !== 'connection_error' && (
            <div className="mb-6 p-4 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => refreshAllData()}
                className="underline hover:text-rose-900 dark:hover:text-rose-100 font-medium ml-4"
              >
                Retry connection
              </button>
            </div>
          )}

          {currentView === 'dashboard' && <DashboardView />}

          {currentView === 'invoices' && (
            <InvoiceListView
              onOpenRecordPayment={handleOpenRecordPayment}
              onOpenCancelInvoice={handleOpenCancelInvoice}
              onOpenDeleteInvoice={handleOpenDeleteInvoice}
            />
          )}

          {currentView === 'create-invoice' && (
            <CreateInvoiceView onOpenNewCustomerModal={handleOpenCreateCustomer} />
          )}

          {currentView === 'customers' && (
            <CustomerListView
              onOpenCreateCustomer={handleOpenCreateCustomer}
              onEditCustomer={handleEditCustomer}
            />
          )}

          {currentView === 'products' && (
            <ProductListView
              onOpenCreateProduct={handleOpenCreateProduct}
              onEditProduct={handleEditProduct}
              onOpenAdjustStock={handleOpenAdjustStock}
            />
          )}

          {currentView === 'payments' && (
            <PaymentsView onOpenRecordPayment={() => handleOpenRecordPayment()} />
          )}

          {currentView === 'expenses' && (
            <ExpensesView onOpenCreateExpense={() => setIsExpenseModalOpen(true)} />
          )}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'settings' && <SettingsView />}

          {currentView === 'ai-assistant' && <AiAssistantView />}

          {currentView === 'privacy-policy' && <PrivacyPolicyView />}

          {currentView === 'terms-conditions' && <TermsConditionsView />}

          {currentView === 'analytics' && <AnalyticsView />}

          {currentView === 'not-found' && <NotFoundView />}

          {/* App Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 no-print">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">BillFlow India</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-teal-600 dark:text-[#00BFA5]">
                <Lock className="w-3 h-3" />
                <span>HTTPS Enforced</span>
              </span>
              <span>•</span>
              <span className="text-slate-400 dark:text-slate-500">GST Rule Compliant</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-medium">
              <button
                onClick={() => setCurrentView('privacy-policy')}
                className="hover:text-teal-600 dark:hover:text-[#00BFA5] hover:underline transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setCurrentView('terms-conditions')}
                className="hover:text-teal-600 dark:hover:text-[#00BFA5] hover:underline transition-colors"
              >
                Terms &amp; Conditions
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className="hover:text-teal-600 dark:hover:text-[#00BFA5] hover:underline transition-colors"
              >
                Privacy Analytics
              </button>
              <button
                onClick={() => setCurrentView('create-invoice')}
                className="text-teal-600 dark:text-[#00BFA5] font-semibold hover:underline"
              >
                + New Invoice
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Global Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <AdjustStockModal
        isOpen={isAdjustStockModalOpen}
        onClose={() => setIsAdjustStockModalOpen(false)}
        product={productToAdjust}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        invoice={invoiceForPayment}
      />

      <CancelInvoiceModal
        isOpen={isCancelInvoiceModalOpen}
        onClose={() => setIsCancelInvoiceModalOpen(false)}
        invoice={invoiceToCancel}
      />

      <DeleteInvoiceModal
        isOpen={isDeleteInvoiceModalOpen}
        onClose={() => {
          setIsDeleteInvoiceModalOpen(false);
          setInvoiceToDelete(null);
        }}
        invoice={invoiceToDelete}
      />

      {/* Invoice Detail / PDF Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        onOpenPaymentModal={handleOpenRecordPayment}
      />

      {/* Authentication & Super Admin Setup Modal */}
      <AuthModal />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <BillingProvider>
      <BillingApp />
    </BillingProvider>
  );
}
