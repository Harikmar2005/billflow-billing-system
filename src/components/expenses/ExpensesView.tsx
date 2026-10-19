import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Expense } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Building,
  Tag,
  CreditCard,
  PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface ExpensesViewProps {
  onOpenCreateExpense: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#f43f5e',
  utilities: '#0284c7',
  salaries: '#8b5cf6',
  inventory_purchase: '#0d9488',
  transport: '#f59e0b',
  marketing: '#ec4899',
  office_supplies: '#64748b',
  repairs: '#eab308',
  tax_fees: '#10b981',
  other: '#94a3b8',
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenCreateExpense }) => {
  const { expenses, deleteExpense, addToast, isDark } = useBilling();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredExpenses = expenses.filter(
    (e) => selectedCategory === 'all' || e.category === selectedCategory
  );

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for chart
  const categoryGroups: Record<string, number> = {};
  for (const exp of expenses) {
    categoryGroups[exp.category] = (categoryGroups[exp.category] || 0) + exp.amount;
  }

  const categoryChartData = Object.keys(categoryGroups).map((cat) => ({
    name: cat.replace('_', ' ').toUpperCase(),
    value: categoryGroups[cat],
    color: CATEGORY_COLORS[cat] || '#64748b',
  }));

  const handleDelete = async (id: string, desc: string) => {
    if (window.confirm(`Delete expense "${desc}"?`)) {
      await deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Expense & Outflow Management
            <span className="text-xs font-mono text-slate-500 font-normal">
              ({expenses.length} records)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track operational business overheads, rent, inventory supplier purchases, and salaries.
          </p>
        </div>

        <button
          onClick={onOpenCreateExpense}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Top Split: KPI & Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KPI Summary */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Business Expenses
            </span>
            <div className="mt-2 text-3xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatINR(totalExpense)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Direct and indirect operational disbursements
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            <strong>Accounting Distinction:</strong> Invoiced revenue reflects bills issued, whereas collections reflect actual cash receipts. Expenses are direct cash/bank disbursements.
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-1/2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Amount']}
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

          <div className="w-full sm:w-1/2 grid grid-cols-2 gap-2 text-xs">
            {categoryChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-700 dark:text-slate-300 text-[11px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">CATEGORY</th>
                  <th className="py-3 px-3">DESCRIPTION</th>
                  <th className="py-3 px-3">VENDOR / SUPPLIER</th>
                  <th className="py-3 px-3">PAYMENT MODE</th>
                  <th className="py-3 px-3 text-right">AMOUNT (₹)</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[exp.category] || '#64748b'}20`,
                          color: CATEGORY_COLORS[exp.category] || '#64748b',
                        }}
                      >
                        {exp.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {exp.description}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-400">
                      {exp.vendorName || '-'}
                    </td>
                    <td className="py-3 px-3 font-sans capitalize text-slate-600 dark:text-slate-400">
                      {exp.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <button
                        onClick={() => handleDelete(exp.id, exp.description)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
