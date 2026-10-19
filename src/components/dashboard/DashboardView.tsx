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
        <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
            Business Dashboard & GST Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial telemetry calculated from verified billing ledger and inventory records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('create-invoice')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg bg-[#009688] hover:bg-[#00796B] text-white font-bold shadow-xs active:scale-95 transition-all"
            title="Create New GST Tax Invoice (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Tax Invoice</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-teal-800 text-teal-100 rounded">
              Ctrl+N
            </kbd>
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#009688]" />
            <span>GSTR-1 Summary</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Sales */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Today's Sales</span>
            <div className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A]">
            {formatINR(todaySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span>Invoices issued today</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">This Month's Sales</span>
            <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A]">
            {formatINR(monthlySales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>Gross invoiced revenue</span>
          </div>
        </div>

        {/* Total Outstanding Receivables */}
        <div
          onClick={() => setCurrentView('invoices')}
          className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Outstanding</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600">
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
          className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs hover:border-teal-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Collections</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
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
        <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Overdue Invoices</div>
            <div className="text-sm font-bold font-mono text-rose-600">
              {overdueCount} ({formatINR(overdueAmount)})
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Active Customers</div>
            <div className="text-sm font-bold font-mono text-[#0F172A]">
              {metrics?.totalCustomers || 0} Registered
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Products & Services</div>
            <div className="text-sm font-bold font-mono text-[#0F172A]">
              {products.length} Items in Catalog
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Total Invoices</div>
            <div className="text-sm font-bold font-mono text-[#0F172A]">
              {invoices.length} Generated
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Monthly Revenue vs Collections & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Collections Bar Chart */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Monthly Invoiced Revenue vs Collections
              </h2>
              <p className="text-[11px] text-slate-500">Billed sales compared against cash received (₹)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
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
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Invoiced Revenue" fill="#009688" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" name="Cash Received" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Distribution Chart */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
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
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#0f172a',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {metrics?.paymentStatusDistribution?.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold text-[#0F172A] mr-2">{item.count}</span>
                  <span className="text-[11px] text-slate-500">{formatINR(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#009688]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Recent Tax Invoices
            </h2>
          </div>
          <button
            onClick={() => setCurrentView('invoices')}
            className="text-xs font-semibold text-[#009688] hover:text-[#00796B] hover:underline flex items-center gap-0.5"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#64748B] font-semibold font-mono text-[11px] border-b border-[#E2E8F0]">
                <th className="py-2.5 px-3">INVOICE NO</th>
                <th className="py-2.5 px-3">CUSTOMER</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-2.5 px-3 text-right">BALANCE DUE</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="odd:bg-white even:bg-[#F8FAFC] hover:bg-slate-100/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#009688]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[#0F172A] font-medium">
                    {inv.customerName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#0F172A]">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    <span className={inv.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {formatINR(inv.balanceDue)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'cancelled'
                          ? 'bg-slate-100 text-slate-500 line-through'
                          : inv.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.paymentStatus === 'partially_paid'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : inv.paymentStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {inv.status === 'cancelled' ? 'Cancelled' : inv.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => setPreviewInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
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
