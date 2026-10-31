import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Invoice } from '../types';
import { isInvoiceOverdue } from '../services/billing';
import { Printer, CheckCircle } from 'lucide-react';

interface CustomerInvoicesViewProps {
  onOpenPrintModal: (invoice: Invoice) => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
}

export function CustomerInvoicesView({
  onOpenPrintModal,
  onOpenPaymentModal,
}: CustomerInvoicesViewProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'PAYMENTS'>('INVOICES');
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    db.getInvoices(currentUser.id)
  );
  const [payments, setPayments] = useState(() =>
    db.getPayments(currentUser.id)
  );

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.issue_date.includes(search);
    if (!matchesSearch) return false;

    if (statusFilter === 'OVERDUE') {
      return isInvoiceOverdue(inv);
    }
    if (statusFilter === 'ALL') return true;
  });

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'DEBIT_CARD':
        return 'Debit Card';
      case 'UPI':
        return 'UPI';
      case 'NET_BANKING':
        return 'Net Banking';
      case 'BANK_TRANSFER':
        return 'Bank Wire';
      case 'CASH':
        return 'Cash';
      case 'CARD':
        return 'Card';
      default:
        return method.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices &amp; Payment History
          </h1>
          <p className="text-sm text-slate-500">
            View itemized billing records, settled payments ledger, and print official tax receipts.
          </p>
        </div>

        {/* Tab Switcher & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                activeTab === 'INVOICES'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                activeTab === 'PAYMENTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment History ({payments.length})
            </button>
          </div>

          {activeTab === 'INVOICES' && (
            <div className="flex items-center gap-1.5">
              {['ALL', 'CONFIRMED', 'PAID', 'OVERDUE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'INVOICES' ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching invoices found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Tax</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    const overdue = isInvoiceOverdue(inv);
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          overdue ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Ref: {inv.subscription_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {inv.due_date}
                          </span>
                          {overdue && (
                            <span className="block text-[10px] text-rose-500 font-bold uppercase">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-600">
                          ${inv.subtotal}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-500">
                          ${inv.tax_amount}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-slate-900">
                          ${inv.total_amount}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-slate-900">
                          <span className={overdue ? 'text-rose-600' : ''}>
                            ${inv.balance_amount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                              <button
                                onClick={() => onOpenPaymentModal(inv)}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-xs"
                              >
                                Pay Online
                              </button>
                            )}
                            <button
                              onClick={() => onOpenPrintModal(inv)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-1.5"
                              title="Print Formal Tax Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
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
      ) : (
        /* Payments History Table */
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-900">No payment transactions recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Completed invoice payments will be recorded here with timestamp, method, and transaction references.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Payment Reference</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pmt) => {
                    const relatedInvoice = invoices.find((inv) => inv.id === pmt.invoice_id);
                    return (
                      <tr key={pmt.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                          {pmt.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {pmt.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {pmt.payment_date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {formatPaymentMethod(pmt.payment_method)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {pmt.note || 'Settled'}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-emerald-700">
                          ${pmt.amount}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Settled
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {relatedInvoice && (
                            <button
                              onClick={() => onOpenPrintModal(relatedInvoice)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors inline-flex items-center gap-1"
                              title="Print Formal Receipt"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

