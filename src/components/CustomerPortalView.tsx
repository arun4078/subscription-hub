import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Invoice, Subscription } from '../types';
import { isInvoiceOverdue } from '../services/billing';
import {
  FileText,
  Receipt,
  Printer,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Clock,
  X,
} from 'lucide-react';

interface CustomerPortalViewProps {
  onOpenPrintModal: (invoice: Invoice) => void;
  defaultTab?: 'SUBSCRIPTIONS' | 'INVOICES';
}

export function CustomerPortalView({
  onOpenPrintModal,
  defaultTab = 'SUBSCRIPTIONS',
}: CustomerPortalViewProps) {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'INVOICES'>(defaultTab);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    db.getSubscriptions(currentUser.id)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    db.getInvoices(currentUser.id)
  );

  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [closeConfirmSub, setCloseConfirmSub] = useState<Subscription | null>(null);

  const refreshData = () => {
    setSubscriptions(db.getSubscriptions(currentUser.id));
    setInvoices(db.getInvoices(currentUser.id));
  };

  const handleCloseOwnSubscription = (sub: Subscription) => {
    db.updateSubscriptionStatus(sub.id, 'CLOSED');
    refreshData();
    setCloseConfirmSub(null);
    if (selectedSub?.id === sub.id) {
      setSelectedSub(db.getSubscriptionById(sub.id) || null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Customer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Self-Service Portal
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Client
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Account: {currentUser.name} ({currentUser.company_name || currentUser.email})
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          <button
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className={`px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === 'SUBSCRIPTIONS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Subscriptions ({subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === 'INVOICES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>My Invoices ({invoices.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'SUBSCRIPTIONS' ? (
        /* My Subscriptions Tab */
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-sm text-slate-500">
              You do not have any registered subscriptions under this account yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {sub.subscription_number}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{sub.plan_name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Cadence: {sub.billing_period} · Terms: {sub.payment_terms}
                    </div>

                    {/* Lines summary */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Included Products ({sub.lines.length})
                      </div>
                      {sub.lines.map((l) => (
                        <div key={l.id} className="flex justify-between text-xs text-slate-700">
                          <span>
                            {l.product_name}{' '}
                            {l.variant_name && (
                              <span className="text-slate-400">({l.variant_name})</span>
                            )}
                          </span>
                          <span className="font-mono tabular-nums">
                            {l.quantity} × ${l.unit_price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-500 font-mono">
                      Next Billing: <span className="font-semibold text-slate-800">{sub.next_billing_date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSub(sub)}
                        className="px-2.5 py-1 text-slate-700 border border-slate-200 hover:bg-slate-50 rounded text-xs"
                      >
                        Details
                      </button>

                      {/* Customer close assumption: customer can close if closable is true and status is ACTIVE */}
                      {sub.status === 'ACTIVE' && sub.closable && (
                        <button
                          onClick={() => setCloseConfirmSub(sub)}
                          className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded font-semibold text-xs"
                        >
                          Cancel / Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Invoices Tab */
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No invoices generated for this account yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const overdue = isInvoiceOverdue(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className={overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {inv.due_date}
                        </span>
                        {overdue && (
                          <span className="block text-[10px] text-rose-500 font-bold uppercase">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-slate-900">
                        ${inv.total_amount}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-slate-900">
                        ${inv.balance_amount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => onOpenPrintModal(inv)}
                            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print Receipt</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Close Confirmation Modal */}
      {closeConfirmSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Cancel Subscription {closeConfirmSub.subscription_number}?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your{' '}
              <strong>{closeConfirmSub.plan_name}</strong> subscription? This will stop recurring
              invoices from generating at the end of the billing cycle.
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
                onClick={() => handleCloseOwnSubscription(closeConfirmSub)}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 text-xs"
              >
                Yes, Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
