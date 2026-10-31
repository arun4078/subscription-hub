import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Invoice, Subscription, SubscriptionStatus } from '../types';
import { isInvoiceOverdue, normalizeToMrr, toCents, toMoney } from '../services/billing';
import { ArrowRight, Printer, ShieldAlert, FileDown, Filter } from 'lucide-react';

interface CustomerDashboardViewProps {
  onNavigateToExplore: () => void;
  onNavigateToInvoices: () => void;
  onOpenPrintModal: (invoice: Invoice) => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
}

export function CustomerDashboardView({
  onNavigateToExplore,
  onNavigateToInvoices,
  onOpenPrintModal,
  onOpenPaymentModal,
}: CustomerDashboardViewProps) {
  const { currentUser } = useAuth();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    db.getSubscriptions(currentUser.id)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    db.getInvoices(currentUser.id)
  );
  const [closeConfirmSub, setCloseConfirmSub] = useState<Subscription | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesBrand = brandFilter === 'ALL' || s.lines.some((l) => l.variant_name?.includes(brandFilter));
    return matchesStatus && matchesBrand;
  });

  const exportToCSV = () => {
    const headers = ['Subscription #', 'Plan', 'Status', 'Start Date', 'Next Billing'];
    const rows = filteredSubscriptions.map((s) => [
      s.subscription_number,
      s.plan_name,
      s.status,
      s.start_date,
      s.next_billing_date,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscriptions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const refreshData = () => {
    setSubscriptions(db.getSubscriptions(currentUser.id));
    setInvoices(db.getInvoices(currentUser.id));
  };


  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');

  // Customer MRR
  let myMonthlySpendCents = 0;
  for (const sub of activeSubs) {
    let subCents = 0;
    for (const line of sub.lines) {
      subCents += line.quantity * toCents(line.unit_price);
    }
    myMonthlySpendCents += normalizeToMrr(subCents, sub.billing_period);
  }

  // Outstanding invoices for this customer
  let totalBalanceCents = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    if (inv.status !== 'CANCELLED' && inv.status !== 'PAID') {
      const b = toCents(inv.balance_amount);
      totalBalanceCents += b;
      if (isInvoiceOverdue(inv)) {
        overdueCount++;
      }
    }
  }

  // Earliest next billing date
  const earliestNextBilling = activeSubs
    .map((s) => s.next_billing_date)
    .sort()[0] || 'No upcoming billing';

  const handleCloseSubscription = (sub: Subscription) => {
    db.updateSubscriptionStatus(sub.id, 'CLOSED');
    refreshData();
    setCloseConfirmSub(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-500">
            {currentUser.company_name || 'Customer Account'} · Enterprise Subscription Dashboard
          </p>
        </div>

        <button
          onClick={onNavigateToExplore}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors shadow-xs"
        >
          Browse All Plans &amp; Brands
        </button>
      </div>

      {/* Customer Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Plans */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Active Subscriptions
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {activeSubs.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Running licenses and brand edition services
          </p>
        </div>

        {/* Monthly Recurring Spending */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Monthly Commitment
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${toMoney(myMonthlySpendCents)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Normalized monthly subscription investment
          </p>
        </div>

        {/* Next Billing Date */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Next Renewal Date
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 truncate">
            {earliestNextBilling}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated cycle renewal date
          </p>
        </div>

        {/* Invoices Balance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Balance Due
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${toMoney(totalBalanceCents)}
          </div>
          <p className="text-xs mt-1">
            {overdueCount > 0 ? (
              <span className="text-rose-600 font-semibold">{overdueCount} invoice overdue</span>
            ) : (
              <span className="text-emerald-600 font-medium">Account in good standing</span>
            )}
          </p>
        </div>
      </div>

      {/* Active Subscriptions Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Active Subscriptions</h2>
            <p className="text-xs text-slate-500">
              Manage your active contracts, edition variants, and seat allocations.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onNavigateToExplore}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Add Plan / Upgrade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded p-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Cancelled</option>
          </select>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded p-1"
          >
            <option value="ALL">All Brands</option>
            {Array.from(new Set(subscriptions.flatMap(s => s.lines.map(l => l.variant_name).filter(Boolean)))).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg text-sm text-slate-500 space-y-3">
            <p>You currently do not have any subscriptions matching these filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {sub.subscription_number}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sub.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{sub.plan_name}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Cadence: {sub.billing_period} · Terms: {sub.payment_terms}
                  </div>

                  {/* Lines */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5">
                    {sub.lines.map((l) => (
                      <div key={l.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{l.product_name}</span>
                          {l.variant_name && (
                            <div className="text-[11px] font-mono text-purple-700">
                              {l.variant_name}
                            </div>
                          )}
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {l.quantity} × ${l.unit_price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 font-mono">
                    Next Billing: <strong className="text-slate-800">{sub.next_billing_date}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.status === 'PAUSED' ? (
                      <button
                        onClick={() => {
                          db.resumeSubscription(sub.id);
                          refreshData();
                        }}
                        className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold text-xs transition-colors"
                      >
                        Resume Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          db.pauseSubscription(sub.id, 'Temporary pause by customer');
                          refreshData();
                        }}
                        className="px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded font-semibold text-xs transition-colors"
                      >
                        Pause
                      </button>
                    )}

                    {sub.closable && (
                      <button
                        onClick={() => setCloseConfirmSub(sub)}
                        className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded font-semibold text-xs transition-colors"
                      >
                        Cancel Plan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Invoices & Receipts</h2>
            <p className="text-xs text-slate-500">
              Download formal print receipts or settle unpaid balances.
            </p>
          </div>
          <button
            onClick={onNavigateToInvoices}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No invoices on file yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 4).map((inv) => {
                  const overdue = isInvoiceOverdue(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{inv.issue_date}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className={overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {inv.due_date}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'CONFIRMED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-right font-semibold text-slate-900">
                        ${inv.total_amount}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-right font-bold text-slate-900">
                        <span className={overdue ? 'text-rose-600' : ''}>
                          ${inv.balance_amount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => onOpenPaymentModal(inv)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                            >
                              Pay Now
                            </button>
                          )}
                          <button
                            onClick={() => onOpenPrintModal(inv)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      {closeConfirmSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Cancel {closeConfirmSub.subscription_number}?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your <strong>{closeConfirmSub.plan_name}</strong>{' '}
              subscription? No further invoices will be generated after the current cycle.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCloseConfirmSub(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-xs"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={() => handleCloseSubscription(closeConfirmSub)}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 text-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
