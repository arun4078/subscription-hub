import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { isInvoiceOverdue } from '../services/billing';
import { Invoice, InvoiceStatus, PaymentMethod } from '../types';
import {
  Printer,
  CreditCard,
  Send,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Eye,
  X,
  Check,
} from 'lucide-react';

interface InvoicesViewProps {
  initialInvoiceId?: string;
  onOpenPrintModal: (invoice: Invoice) => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
}

export function InvoicesView({
  initialInvoiceId,
  onOpenPrintModal,
  onOpenPaymentModal,
}: InvoicesViewProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';
  const isStaff = currentUser.role === 'STAFF';

  const [invoices, setInvoices] = useState<Invoice[]>(() => db.getInvoices());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(() => {
    if (initialInvoiceId) {
      return db.getInvoiceById(initialInvoiceId) || null;
    }
    return null;
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (onlyOverdue) {
      return isInvoiceOverdue(inv);
    }
    if (statusFilter === 'ALL') return true;
    return inv.status === statusFilter;
  });

  const handleConfirmInvoice = (inv: Invoice) => {
    db.updateInvoiceStatus(inv.id, 'CONFIRMED');
    setInvoices(db.getInvoices());
    if (selectedInvoice?.id === inv.id) {
      setSelectedInvoice(db.getInvoiceById(inv.id) || null);
    }
  };

  const handleCancelInvoice = (inv: Invoice) => {
    if (confirm('Cancel this invoice? This action cannot be reversed for paid invoices.')) {
      try {
        db.updateInvoiceStatus(inv.id, 'CANCELLED');
        setInvoices(db.getInvoices());
        if (selectedInvoice?.id === inv.id) {
          setSelectedInvoice(db.getInvoiceById(inv.id) || null);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSendInvoice = (inv: Invoice) => {
    // Per specification: mock send email to customer
    setSendSuccessMessage(
      `Invoice ${inv.invoice_number} dispatched to registered customer email: ${inv.customer_email}`
    );
    setTimeout(() => {
      setSendSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices & Billing History
          </h1>
          <p className="text-sm text-slate-500">
            Auto-generated from subscriptions with automated discounts and tax computations.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setOnlyOverdue(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st && !onlyOverdue
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              onlyOverdue
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Only</span>
          </button>
        </div>
      </div>

      {sendSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{sendSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSendSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-4 font-semibold">Invoice #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Issue Date</th>
              <th className="py-3 px-4 font-semibold">Due Date</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
              <th className="py-3 px-4 font-semibold text-right">Tax</th>
              <th className="py-3 px-4 font-semibold text-right">Total</th>
              <th className="py-3 px-4 font-semibold text-right">Balance</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.map((inv) => {
              const overdue = isInvoiceOverdue(inv);
              return (
                <tr
                  key={inv.id}
                  className={`hover:bg-slate-50/50 transition-colors ${
                    overdue ? 'bg-rose-50/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:underline text-blue-600 font-bold"
                    >
                      {inv.invoice_number}
                    </button>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {inv.subscription_number}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{inv.customer_email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className={overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {inv.due_date}
                    </span>
                    {overdue && (
                      <span className="block text-[10px] text-rose-500 font-semibold uppercase">
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
                          : inv.status === 'DRAFT'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                  <td className="py-3.5 px-4 font-mono tabular-nums text-right font-semibold">
                    <span className={overdue ? 'text-rose-600' : 'text-slate-800'}>
                      ${inv.balance_amount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Print */}
                      <button
                        onClick={() => onOpenPrintModal(inv)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Send */}
                      <button
                        onClick={() => handleSendInvoice(inv)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        title="Send via Email"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Confirm Draft */}
                      {inv.status === 'DRAFT' && (isAdmin || isStaff) && (
                        <button
                          onClick={() => handleConfirmInvoice(inv)}
                          className="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        >
                          Confirm
                        </button>
                      )}

                      {/* Record Payment */}
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (isAdmin || isStaff) && (
                        <button
                          onClick={() => onOpenPaymentModal(inv)}
                          className="px-2 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
                        >
                          Pay
                        </button>
                      )}

                      {/* Cancel */}
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (isAdmin || isStaff) && (
                        <button
                          onClick={() => handleCancelInvoice(inv)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Cancel Invoice"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedInvoice.invoice_number}
                </h3>
                <p className="text-xs text-slate-500">
                  For {selectedInvoice.customer_name} ({selectedInvoice.customer_email})
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoicing Cycle Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 block text-[11px]">Issue Date</span>
                <span className="font-semibold text-slate-900">{selectedInvoice.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Due Date</span>
                <span className="font-semibold text-slate-900">{selectedInvoice.due_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Period Start</span>
                <span className="text-slate-700">{selectedInvoice.billing_period_start}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Period End</span>
                <span className="text-slate-700">{selectedInvoice.billing_period_end}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold">Line Item</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Discount</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Tax</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines.map((ln) => (
                    <tr key={ln.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{ln.product_name}</div>
                        {ln.variant_name && (
                          <div className="text-[11px] text-slate-500">{ln.variant_name}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{ln.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        ${ln.unit_price}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-purple-600">
                        -${ln.discount_amount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        ${ln.tax_amount} ({ln.tax_rate}%)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        ${ln.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded border border-slate-200 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.subtotal}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Auto Discounts:</span>
                  <span>-${selectedInvoice.discount_amount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount:</span>
                  <span>+${selectedInvoice.tax_amount}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
                  <span>Grand Total:</span>
                  <span>${selectedInvoice.total_amount}</span>
                </div>
                <div className="flex justify-between text-emerald-600 pt-1">
                  <span>Paid to Date:</span>
                  <span>${selectedInvoice.paid_amount}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600">
                  <span>Balance Due:</span>
                  <span>${selectedInvoice.balance_amount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenPrintModal(selectedInvoice)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Friendly Format</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (isAdmin || isStaff) && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPaymentModal(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                    className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 text-xs"
                  >
                    Record Payment
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
