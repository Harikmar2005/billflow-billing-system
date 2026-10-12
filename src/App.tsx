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
import { InvoicePreviewModal } from './components/invoices/InvoicePreviewModal';

import { Customer, Product, Invoice } from './types';
import { Shield, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => refreshAllData()}
                className="underline hover:text-rose-800 dark:hover:text-white font-medium ml-4"
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
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 no-print">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">BillFlow India</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <Lock className="w-3 h-3" />
                <span>HTTPS Enforced</span>
              </span>
              <span>•</span>
              <span className="text-slate-400">GST Rule Compliant</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-medium">
              <button
                onClick={() => setCurrentView('privacy-policy')}
                className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setCurrentView('terms-conditions')}
                className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors"
              >
                Terms &amp; Conditions
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors"
              >
                Privacy Analytics
              </button>
              <button
                onClick={() => setCurrentView('create-invoice')}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
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

      {/* Invoice Detail / PDF Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        onOpenPaymentModal={handleOpenRecordPayment}
      />

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
