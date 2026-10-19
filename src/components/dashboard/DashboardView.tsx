import React from 'react';
import { useBilling } from '../../context/BillingContext';
import { formatINR, formatDate } from '../../utils/billing';
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
  Package,
  Clock,
  ArrowUpRight,
  FileText,
  CreditCard,
  Plus,
  AlertTriangle,
  Receipt,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardView: React.FC = () => {
  const {
    metrics,
    invoices,
    products,
    setCurrentView,
    setPreviewInvoice,
    isDark,
  } = useBilling();

  const todaySales = metrics?.todaySales || 0;
  const monthlySales = metrics?.monthlySales || 0;
  const totalOutstanding = metrics?.totalOutstanding || 0;
  const totalPaid = metrics?.totalPaid || 0;
  const overdueCount = metrics?.overdueCount || 0;
  const overdueAmount = metrics?.overdueAmount || 0;
  const lowStockCount = metrics?.lowStockCount || 0;

  const revenueData = metrics?.monthlyRevenueSeries || [];
  const statusData = (metrics?.paymentStatusDistribution || []).filter((s) => s.count > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Low Stock Warning if any */}
      {lowStockCount > 0 && (
        <div className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Inventory Alert:</strong> {lowStockCount} physical product(s) have fallen below minimum reorder thresholds.
            </span>
          </div>
          <button
            onClick={() => setCurrentView('products')}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            Review Stock
          </button>
        </div>
      )}

      {/* Header and Quick CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            Business Dashboard & GST Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial telemetry calculated from verified billing ledger and inventory records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg bg-[#009688] hover:bg-[#00796B] dark:bg-[#00BFA5] dark:hover:bg-[#009688] text-white font-bold shadow-xs active:scale-95 transition-all"
            title="Create New GST Tax Invoice (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Tax Invoice</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-teal-800 dark:bg-teal-900 text-teal-100 rounded">
              Ctrl+N
            </kbd>
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E293B] font-medium shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#009688] dark:text-[#00BFA5]" />
            <span>GSTR-1 Summary</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Sales */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Today's Sales</span>
            <div className="w-7 h-7 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC]">
            {formatINR(todaySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Invoices issued today</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">This Month's Sales</span>
            <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC]">
            {formatINR(monthlySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Gross invoiced revenue</span>
          </div>
        </div>

        {/* Total Outstanding Receivables */}
        <div
          onClick={() => setCurrentView('invoices')}
          className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Outstanding</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(totalOutstanding)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Pending customer payments</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Total Paid / Collections */}
        <div
          onClick={() => setCurrentView('payments')}
          className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs hover:border-teal-500 dark:hover:border-[#00BFA5] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Collections</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(totalPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Cash received to date</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600 dark:text-[#00BFA5]" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Overdue Invoices</div>
            <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              {overdueCount} ({formatINR(overdueAmount)})
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Active Customers</div>
            <div className="text-sm font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {metrics?.totalCustomers || 0} Registered
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Products & Services</div>
            <div className="text-sm font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {products.length} Items in Catalog
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Invoices</div>
            <div className="text-sm font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {invoices.length} Generated
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Monthly Revenue vs Collections & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Collections Bar Chart */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Monthly Invoiced Revenue vs Collections
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Billed sales compared against cash received (₹)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Last 6 Months
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#111827' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: isDark ? '#94a3b8' : '#64748b' }} />
                <Bar dataKey="revenue" name="Invoiced Revenue" fill={isDark ? '#00BFA5' : '#009688'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" name="Cash Received" fill={isDark ? '#38BDF8' : '#0284c7'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Distribution Chart */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Payment Status Distribution
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Active</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Outstanding vs settled invoices</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(count: any, name: any, item: any) => [
                      `${count} Invoices (${formatINR(item.payload.amount)})`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: isDark ? '#111827' : '#ffffff',
                      borderColor: isDark ? '#1e293b' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#1E293B]">
            {metrics?.paymentStatusDistribution?.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mr-2">{item.count}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatINR(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#009688] dark:text-[#00BFA5]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Recent Tax Invoices
            </h2>
          </div>
          <button
            onClick={() => setCurrentView('invoices')}
            className="text-xs font-semibold text-[#009688] dark:text-[#00BFA5] hover:underline flex items-center gap-0.5"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-[#E2E8F0] dark:border-[#1E293B]">
          <table className="w-full text-left text-xs bg-white dark:bg-[#0F172A]">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-[#020617] text-[#64748B] dark:text-[#94A3B8] font-semibold font-mono text-[11px] border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <th className="py-2.5 px-3">INVOICE NO</th>
                <th className="py-2.5 px-3">CUSTOMER</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-2.5 px-3 text-right">BALANCE DUE</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] font-mono">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="odd:bg-white dark:odd:bg-[#0F172A] even:bg-[#F8FAFC] dark:even:bg-[#0A1122] hover:bg-slate-100/80 dark:hover:bg-[#1E293B]/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#009688] dark:text-[#00BFA5]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[#0F172A] dark:text-[#F8FAFC] font-medium">
                    {inv.customerName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    <span className={inv.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {formatINR(inv.balanceDue)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'cancelled'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 line-through'
                          : inv.paymentStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : inv.paymentStatus === 'partially_paid'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          : inv.paymentStatus === 'overdue'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {inv.status === 'cancelled' ? 'Cancelled' : inv.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => setPreviewInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-[#111827] hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
                    >
                      View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
