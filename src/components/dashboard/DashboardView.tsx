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
        <div className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-sm">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Business Dashboard & GST Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial telemetry calculated from verified billing ledger and inventory records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tax Invoice</span>
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>GSTR-1 Summary</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Sales */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Today's Sales</span>
            <div className="w-7 h-7 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatINR(todaySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span>Invoices issued today</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">This Month's Sales</span>
            <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatINR(monthlySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>Gross invoiced revenue</span>
          </div>
        </div>

        {/* Total Outstanding Receivables */}
        <div
          onClick={() => setCurrentView('invoices')}
          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Outstanding</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(totalOutstanding)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Pending customer payments</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
          </div>
        </div>

        {/* Total Paid / Collections */}
        <div
          onClick={() => setCurrentView('payments')}
          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-teal-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Collections</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
            {formatINR(totalPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Cash received to date</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Overdue Invoices</div>
            <div className="text-sm font-bold font-mono text-rose-600">
              {overdueCount} ({formatINR(overdueAmount)})
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Active Customers</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {metrics?.totalCustomers || 0} Registered
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Products & Services</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {products.length} Items in Catalog
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Total Invoices</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {invoices.length} Generated
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Monthly Revenue vs Collections & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Collections Bar Chart */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Monthly Invoiced Revenue vs Collections
              </h2>
              <p className="text-[11px] text-slate-500">Billed sales compared against cash received (₹)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Last 6 Months
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Invoiced Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" name="Cash Received" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Distribution Chart */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Payment Status Distribution
              </h2>
              <span className="text-[11px] font-mono text-slate-500">Active</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Outstanding vs settled invoices</p>

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
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {metrics?.paymentStatusDistribution?.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mr-2">{item.count}</span>
                  <span className="text-[11px] text-slate-500">{formatINR(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Recent Tax Invoices
            </h2>
          </div>
          <button
            onClick={() => setCurrentView('invoices')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold font-mono text-[11px]">
                <th className="py-2.5 px-3">INVOICE NO</th>
                <th className="py-2.5 px-3">CUSTOMER</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-2.5 px-3 text-right">BALANCE DUE</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300 font-medium">
                    {inv.customerName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    <span className={inv.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600'}>
                      {formatINR(inv.balanceDue)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'cancelled'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 line-through'
                          : inv.paymentStatus === 'paid'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          : inv.paymentStatus === 'partially_paid'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                          : inv.paymentStatus === 'overdue'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {inv.status === 'cancelled' ? 'Cancelled' : inv.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => setPreviewInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 transition-colors"
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
