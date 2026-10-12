import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Customer, Invoice } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  ArrowUpRight,
  Search,
  Building,
  Edit2,
  Trash2,
  Receipt,
  AlertTriangle,
  Archive,
  RefreshCw,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface CustomerListViewProps {
  onOpenCreateCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

interface DeleteCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
  onConfirmArchive: (id: string) => Promise<void>;
  customerInvoicesCount: number;
  totalBilledAmount: number;
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  customer,
  isOpen,
  onClose,
  onConfirmDelete,
  onConfirmArchive,
  customerInvoicesCount,
  totalBilledAmount,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forceArchiveMode, setForceArchiveMode] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setErrorMessage(null);
      setForceArchiveMode(false);
    }
  }, [isOpen, customer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !customer) return null;

  const hasFinancialHistory =
    customerInvoicesCount > 0 ||
    totalBilledAmount > 0 ||
    (customer.invoiceCount || 0) > 0 ||
    forceArchiveMode;

  const handleDelete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await onConfirmDelete(customer.id);
      onClose();
    } catch (err: any) {
      console.error('Customer deletion error:', err);
      // Check if backend rejected because of linked records (409 or message)
      if (
        err.status === 409 ||
        err.status === 400 ||
        (err.data && err.data.canArchive) ||
        (err.message && err.message.toLowerCase().includes('invoice'))
      ) {
        setForceArchiveMode(true);
        setErrorMessage(
          err.message ||
            'Cannot permanently delete a customer with financial history. Archive this customer instead.'
        );
      } else {
        setErrorMessage(err.message || 'Failed to delete customer. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await onConfirmArchive(customer.id);
      onClose();
    } catch (err: any) {
      console.error('Customer archive error:', err);
      setErrorMessage(err.message || 'Failed to archive customer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-customer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                hasFinancialHistory
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              }`}
            >
              {hasFinancialHistory ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2
                id="delete-customer-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {hasFinancialHistory ? 'Customer Has Financial History' : 'Delete Customer'}
              </h2>
              <p className="text-xs text-slate-500">
                {hasFinancialHistory
                  ? 'Tax and ledger audit protection active'
                  : 'Confirm permanent customer removal'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Customer Highlight Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                  Customer Profile
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {customer.name}
                </h3>
              </div>
              {customer.gstin && (
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
                  GSTIN: {customer.gstin}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>
                    {customer.city}, {customer.state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Joined {formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Conditional Workflow depending on financial records */}
          {hasFinancialHistory ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>Permanent deletion blocked to preserve financial integrity</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  This customer is linked to{' '}
                  <strong className="font-semibold underline">
                    {customerInvoicesCount || customer.invoiceCount || 1} invoice(s)
                  </strong>{' '}
                  with a total billed volume of{' '}
                  <strong className="font-semibold font-mono">
                    {formatINR(totalBilledAmount || customer.totalBilled || 0)}
                  </strong>
                  . Under GST billing compliance and accounting rules, permanently deleting customers with financial transaction history is prohibited.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Recommended Action: Archive Customer
                </span>
                <p className="text-[11px] leading-relaxed">
                  Archiving deactivates the customer profile. They will disappear from your default
                  active customer directory and new invoice pickers, but all existing invoices,
                  receipts, GST filings, and revenue reports will remain 100% intact.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 space-y-1">
                <p className="text-sm font-semibold">
                  Are you sure you want to delete this customer?
                </p>
                <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                  This customer has no associated invoices or payments. Confirming will permanently
                  remove <strong className="font-bold">"{customer.name}"</strong> from your database.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px]">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span>Financial safety verified: No invoices or payments linked.</span>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {hasFinancialHistory ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Archiving...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Customer</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Customer...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Customer</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  onOpenCreateCustomer,
  onEditCustomer,
}) => {
  const {
    customers,
    invoices,
    deleteCustomer,
    archiveCustomer,
    unarchiveCustomer,
    setCurrentView,
    setPreviewInvoice,
    searchQuery,
  } = useBilling();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'archived' | 'all'>('active');

  // Filter customers by active/archived status and search query
  const filteredCustomers = customers.filter((c) => {
    // Status tab filter: default 'active' hides archived customers
    if (filterTab === 'active' && c.isArchived) return false;
    if (filterTab === 'archived' && !c.isArchived) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.state && c.state.toLowerCase().includes(q))
    );
  });

  const activeCount = customers.filter((c) => !c.isArchived).length;
  const archivedCount = customers.filter((c) => c.isArchived).length;
  const totalCount = customers.length;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const customerInvoices = selectedCustomer
    ? invoices.filter((i) => i.customerId === selectedCustomer.id)
    : [];

  const handleOpenDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const handleCloseDelete = () => {
    setCustomerToDelete(null);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteCustomer(id);
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  const handleConfirmArchive = async (id: string) => {
    await archiveCustomer(id);
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  const handleUnarchive = async (id: string) => {
    await unarchiveCustomer(id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Customer Directory & Ledgers
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({filteredCustomers.length} displayed)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage buyer profiles, GSTIN registrations, outstanding balances, and historical invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterTab === 'active'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterTab('archived')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterTab === 'archived'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Archived ({archivedCount})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
          </div>

          <button
            onClick={onOpenCreateCustomer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Split: Customers List on Left / Customer Ledger on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Cards (7 or 12 cols) */}
        <div className={`${selectedCustomer ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                {filterTab === 'archived'
                  ? 'No archived customers found.'
                  : 'No customers matching criteria found.'}
              </p>
              {filterTab === 'active' && (
                <button
                  onClick={onOpenCreateCustomer}
                  className="mt-3 px-3 py-1.5 rounded-md bg-teal-600 text-white font-semibold text-xs"
                >
                  Create First Customer
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const outstanding = c.outstandingBalance || 0;
                const linkedInvoices = invoices.filter((i) => i.customerId === c.id);
                const invCount = c.invoiceCount !== undefined ? c.invoiceCount : linkedInvoices.length;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between text-xs group relative ${
                      c.isArchived
                        ? 'opacity-85 border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-slate-900/60'
                        : isSelected
                        ? 'border-teal-500 bg-teal-50/20 dark:bg-slate-900 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Name & GSTIN */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                              {c.name}
                            </h3>
                            {c.isArchived && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                Archived
                              </span>
                            )}
                          </div>

                          {c.gstin ? (
                            <span className="font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-400 block">
                              GSTIN: {c.gstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans block">
                              Consumer / Unregistered
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {c.stateCode} - {c.state}
                        </span>
                      </div>

                      {/* Contact & Location */}
                      <div className="mt-3 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>
                              {c.city}, {c.state}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial summary bar & Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {invCount > 0 ? `${invCount} Invoices • Balance Due` : 'No Invoices • Balance Due'}
                        </span>
                        <span
                          className={`font-bold ${
                            outstanding > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-teal-600'
                          }`}
                        >
                          {formatINR(outstanding)}
                        </span>
                      </div>

                      {/* Card Action Buttons: Edit and Delete */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {c.isArchived ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnarchive(c.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-sans font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                            title="Restore customer to active directory"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        ) : null}

                        {/* Edit Button with pencil icon */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomer(c);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                          title="Edit Customer"
                          aria-label={`Edit ${c.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button with trash icon */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDelete(c);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors"
                          title="Delete Customer"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Ledger Drawer (5 cols) */}
        {selectedCustomer && (
          <div className="lg:col-span-5 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Customer Ledger History
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedCustomer.name}
                  </h2>
                  {selectedCustomer.isArchived && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                      Archived
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                aria-label="Close ledger"
              >
                ✕ Close
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">Total Billed</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatINR(selectedCustomer.totalBilled || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">Outstanding Balance</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatINR(selectedCustomer.outstandingBalance || 0)}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Invoices for this Buyer ({customerInvoices.length})
              </h4>

              {customerInvoices.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No invoices generated for this customer yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setPreviewInvoice(inv)}
                      className="p-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer text-xs font-mono flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Date: {formatDate(inv.invoiceDate)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(inv.totalAmount)}
                        </div>
                        <span
                          className={`text-[10px] uppercase font-sans font-semibold px-1.5 py-0.2 rounded ${
                            inv.paymentStatus === 'paid'
                              ? 'text-teal-700 bg-teal-50 dark:bg-teal-950/60'
                              : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => setCurrentView('create-invoice')}
                disabled={selectedCustomer.isArchived}
                className="flex-1 py-2 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedCustomer.isArchived
                  ? 'Archived (Cannot Create New Invoice)'
                  : 'Generate New Invoice for this Buyer'}
              </button>

              <button
                onClick={() => handleOpenDelete(selectedCustomer)}
                className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete or Archive Customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete / Archive Confirmation Modal */}
      <DeleteCustomerModal
        customer={customerToDelete}
        isOpen={!!customerToDelete}
        onClose={handleCloseDelete}
        onConfirmDelete={handleConfirmDelete}
        onConfirmArchive={handleConfirmArchive}
        customerInvoicesCount={
          customerToDelete
            ? invoices.filter((i) => i.customerId === customerToDelete.id).length
            : 0
        }
        totalBilledAmount={
          customerToDelete
            ? customerToDelete.totalBilled ||
              invoices
                .filter((i) => i.customerId === customerToDelete.id)
                .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
            : 0
        }
      />
    </div>
  );
};
