import React from 'react';
import { Invoice } from '../types';
import { Printer, X } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function PrintInvoiceModal({ invoice, onClose }: PrintInvoiceModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Container - hide actions during print */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full my-8 p-8 text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Print Preview
            </span>
            <span className="text-xs font-mono text-slate-400">·</span>
            <span className="text-xs font-mono text-slate-700">{invoice.invoice_number}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Generate PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document Section */}
        <div className="pt-6 space-y-8">
          {/* Company & Invoice Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                  B
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Brightloop Software Ltd.
                </h1>
              </div>
              <p className="text-xs text-slate-500">100 Innovation Way, Suite 400</p>
              <p className="text-xs text-slate-500">San Francisco, CA 94107</p>
              <p className="text-xs text-slate-500 font-mono">billing@brightloop.io</p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                TAX INVOICE
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Invoice #: <strong className="text-slate-900">{invoice.invoice_number}</strong>
              </div>
              <div className="text-xs font-mono text-slate-500">
                Sub Ref: {invoice.subscription_number}
              </div>
              <div className="mt-2 inline-block px-2.5 py-0.5 text-xs font-bold font-mono uppercase rounded border border-slate-300 bg-slate-50">
                Status: {invoice.status}
              </div>
            </div>
          </div>

          {/* Bill-To & Dates Row */}
          <div className="grid grid-cols-2 gap-8 text-xs py-4 border-t border-b border-slate-200">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Billed To:
              </div>
              <div className="font-bold text-sm text-slate-900">{invoice.customer_name}</div>
              <div className="text-slate-600 font-mono mt-0.5">{invoice.customer_email}</div>
              <div className="text-slate-500 mt-1">Enterprise Subscription Account</div>
            </div>

            <div className="space-y-1 font-mono text-right">
              <div>
                <span className="text-slate-500">Issue Date: </span>
                <span className="font-semibold text-slate-900">{invoice.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-500">Due Date: </span>
                <span className="font-semibold text-slate-900">{invoice.due_date}</span>
              </div>
              <div>
                <span className="text-slate-500">Period: </span>
                <span className="text-slate-700">
                  {invoice.billing_period_start} to {invoice.billing_period_end}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Tax (%)</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.lines.map((ln) => (
                  <tr key={ln.id}>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{ln.product_name}</div>
                      {ln.variant_name && (
                        <div className="text-[11px] text-slate-500">{ln.variant_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{ln.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">${ln.unit_price}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {parseFloat(ln.discount_amount) > 0 ? `-$${ln.discount_amount}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      ${ln.tax_amount} ({ln.tax_rate}%)
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      ${ln.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Totals */}
          <div className="flex justify-between items-start text-xs pt-2">
            <div className="max-w-xs space-y-1 text-slate-500">
              <div className="font-semibold text-slate-700">Payment Terms & Instructions</div>
              <p>
                Payment is required by {invoice.due_date}. We accept Credit Cards, Debit Cards,
                UPI, Net Banking, and Bank Wire Transfers.
              </p>
              <p className="font-mono text-[11px]">Wire Routing: BRIGHTLOOP-SWIFT-99182</p>
            </div>

            <div className="w-64 space-y-1.5 font-mono text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${invoice.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Discounts:</span>
                <span>-${invoice.discount_amount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Tax:</span>
                <span>+${invoice.tax_amount}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-300 text-sm">
                <span>Invoice Total:</span>
                <span>${invoice.total_amount}</span>
              </div>
              <div className="flex justify-between text-emerald-700 pt-1">
                <span>Amount Paid:</span>
                <span>${invoice.paid_amount}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-rose-600 pt-1 border-t border-slate-200">
                <span>Balance Due:</span>
                <span>${invoice.balance_amount}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-8 border-t border-slate-200 text-center text-[11px] text-slate-400">
            Thank you for choosing Brightloop Software as your recurring business partner.
          </div>
        </div>
      </div>
    </div>
  );
}
