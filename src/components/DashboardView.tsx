import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import { isInvoiceOverdue, toCents, toMoney } from '../services/billing';
import { Invoice, Payment, Subscription } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Users,
  Calendar,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToInvoice: (invoiceId: string) => void;
  onNavigateToSubscription: (subId: string) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export function DashboardView({
  onNavigateToInvoice,
  onNavigateToSubscription,
  onRecordPayment,
}: DashboardViewProps) {
  const stats = db.getDashboardStats();
  const allInvoices = db.getInvoices();
  const allSubs = db.getSubscriptions();
  const allPayments = db.getPayments();

  const [dateFilter, setDateFilter] = useState<'ALL' | '30DAYS' | '90DAYS'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');

  // Customer options for filter
  const customers = useMemo(() => {
    const map = new Map<string, string>();
    allSubs.forEach((s) => map.set(s.customer_id, s.customer_name));
    return Array.from(map.entries());
  }, [allSubs]);

  // Overdue Invoices (Computed per specification)
  const overdueInvoices = useMemo(() => {
    return allInvoices
      .filter((inv) => isInvoiceOverdue(inv))
      .filter((inv) =>
        selectedCustomerId === 'ALL' ? true : inv.customer_id === selectedCustomerId
      );
  }, [allInvoices, selectedCustomerId]);

  // Active Subscriptions
  const activeSubscriptions = useMemo(() => {
    return allSubs
      .filter((s) => s.status === 'ACTIVE')
      .filter((s) =>
        selectedCustomerId === 'ALL' ? true : s.customer_id === selectedCustomerId
      );
  }, [allSubs, selectedCustomerId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Finance & Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time subscription metrics, monthly recurring revenue, and payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-md text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none"
            >
              <option value="ALL">All Customers</option>
              {customers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                dateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('30DAYS')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                dateFilter === '30DAYS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Last 30d
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.active_subscriptions_count}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Running contracts generating recurring revenue
          </p>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Normalized MRR</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${stats.mrr}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Daily, weekly, and yearly plans normalized to month
          </p>
        </div>

        {/* Total Collected Revenue */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue Paid</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${stats.total_revenue_collected}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matched payments deposited into bank & accounts
          </p>
        </div>

        {/* Outstanding & Overdue */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${stats.total_outstanding}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">
            ${stats.overdue_amount} ({stats.overdue_invoices_count} overdue)
          </p>
        </div>
      </div>

      {/* Overdue Invoices Alert Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Action Required: Overdue Invoices ({overdueInvoices.length})
              </h2>
              <p className="text-xs text-slate-500">
                Status is Confirmed, due date has elapsed, and balance remains unpaid.
              </p>
            </div>
          </div>
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            No overdue invoices! All payments are currently in good standing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Due Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Invoice Total</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Unpaid Balance</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <button
                        onClick={() => onNavigateToInvoice(inv.id)}
                        className="hover:underline text-blue-600 font-bold"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{inv.customer_name}</td>
                    <td className="py-3 px-4 font-mono text-rose-600 font-medium">{inv.due_date}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-600">
                      ${inv.total_amount}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-rose-600">
                      ${inv.balance_amount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onRecordPayment(inv)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Split Grid: Active Subscriptions & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Subscriptions Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Active Subscriptions</h2>
            <span className="text-xs text-slate-500 font-mono">
              {activeSubscriptions.length} total
            </span>
          </div>

          <div className="space-y-3">
            {activeSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 rounded-md bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToSubscription(sub.id)}
                      className="font-mono text-xs font-bold text-blue-600 hover:underline"
                    >
                      {sub.subscription_number}
                    </button>
                    <span className="text-xs font-semibold text-slate-800">{sub.plan_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{sub.customer_name}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-slate-600">
                    Next: <span className="font-semibold text-slate-900">{sub.next_billing_date}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Cycle: {sub.billing_period}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payment Receipts */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Payment Ledger</h2>
            <span className="text-xs text-slate-500 font-mono">
              {allPayments.length} recorded
            </span>
          </div>

          <div className="space-y-3">
            {allPayments.slice(0, 5).map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between p-3 rounded-md bg-slate-50/70 border border-slate-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {pay.invoice_number}
                    </span>
                    <span className="text-xs text-slate-500">via {pay.payment_method}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{pay.note || pay.customer_name}</p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono tabular-nums text-emerald-600">
                    +${pay.amount}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{pay.payment_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
