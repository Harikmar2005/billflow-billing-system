import React, { useState } from 'react';
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
  Receipt
} from 'lucide-react';

interface CustomerListViewProps {
  onOpenCreateCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  onOpenCreateCustomer,
  onEditCustomer,
}) => {
  const {
    customers,
    invoices,
    deleteCustomer,
    setCurrentView,
    setPreviewInvoice,
    searchQuery,
  } = useBilling();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      q === '' ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      c.city.toLowerCase().includes(q)
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const customerInvoices = selectedCustomer
    ? invoices.filter((i) => i.customerId === selectedCustomer.id)
    : [];

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete customer "${name}"? Only allowed if no invoices are linked.`)) {
      await deleteCustomer(id);
      if (selectedCustomerId === id) setSelectedCustomerId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Customer Directory & Ledgers
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({filteredCustomers.length} total)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage buyer profiles, GSTIN registrations, outstanding balances, and historical invoices.
          </p>
        </div>

        <button
          onClick={onOpenCreateCustomer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Main Split: Customers List on Left / Customer Ledger on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Cards (7 or 12 cols) */}
        <div className={`${selectedCustomer ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No customers found.</p>
              <button
                onClick={onOpenCreateCustomer}
                className="mt-3 px-3 py-1.5 rounded-md bg-teal-600 text-white font-semibold text-xs"
              >
                Create First Customer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const outstanding = c.outstandingBalance || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between text-xs group ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/20 dark:bg-slate-900 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Name & GSTIN */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                            {c.name}
                          </h3>
                          {c.gstin ? (
                            <span className="font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                              GSTIN: {c.gstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">Consumer / Unregistered</span>
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
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{c.city}, {c.state}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial summary bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Balance Due</span>
                        <span className={`font-bold ${outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600'}`}>
                          {formatINR(outstanding)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomer(c);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.id, c.name);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Customer"
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
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustomer.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
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
                              ? 'text-teal-700 bg-teal-50'
                              : 'text-amber-700 bg-amber-50'
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

            {/* Quick Action */}
            <button
              onClick={() => setCurrentView('create-invoice')}
              className="w-full py-2 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              Generate New Invoice for this Buyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
