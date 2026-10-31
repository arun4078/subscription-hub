"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Invoice, PaymentMethod } from "@/lib/types";
import { api, isInvoiceOverdue } from "@/lib/api";
import {
  ArrowLeft, Printer, Send, CheckCircle, XCircle, CreditCard, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PageProps { params: Promise<{ id: string }>; }

export default function InvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [refNumber, setRefNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await api.getInvoiceById(resolvedParams.id);
      setInvoice(res.data);
      setPaymentAmount(Number(Math.max(0, res.data.total - res.data.amountPaid).toFixed(2)));
    } catch {
      toast.error("Invoice not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadInvoice(); }, [resolvedParams.id]);

  const handleConfirmInvoice = async () => {
    if (!invoice) return;
    try {
      const res = await api.updateInvoiceStatus(invoice.id, "CONFIRMED");
      setInvoice(res.data);
      toast.success("Invoice Confirmed", { description: `${invoice.invoiceNumber} is now confirmed.` });
    } catch { toast.error("Failed to confirm invoice"); }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    try {
      const res = await api.updateInvoiceStatus(invoice.id, "CANCELLED");
      setInvoice(res.data);
      setIsCancelConfirmOpen(false);
      toast.warning("Invoice Cancelled", { description: `${invoice.invoiceNumber} has been voided.` });
    } catch { toast.error("Failed to cancel invoice"); }
  };

  const handleSendInvoice = () => {
    if (!invoice) return;
    toast.success("Invoice Dispatched", { description: `${invoice.invoiceNumber} emailed to ${invoice.customerName}.` });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || paymentAmount <= 0) return;
    try {
      await api.recordPayment({
        invoiceId: invoice.id,
        amount: Number(paymentAmount),
        paymentMethod,
        referenceNumber: refNumber || undefined,
        notes: paymentNotes || undefined,
      });
      toast.success("Payment Recorded", { description: `Collected $${Number(paymentAmount).toFixed(2)} via ${paymentMethod}.` });
      setIsPaymentModalOpen(false);
      loadInvoice();
    } catch { toast.error("Failed to record payment"); }
  };

  if (isLoading || !invoice) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-[#6c757d]">Loading invoice details...</div>
      </DashboardLayout>
    );
  }

  const isOverdue = isInvoiceOverdue(invoice);
  const remainingBalance = Math.max(0, invoice.total - invoice.amountPaid);
  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="p-2 rounded-xl bg-white border border-[#dee2e6] text-[#6c757d] hover:text-[#212529] hover:bg-[#e9ecef] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-[#212529] font-mono">
                  {invoice.invoiceNumber}
                </h1>
                {isOverdue ? <StatusBadge status="OVERDUE" /> : <StatusBadge status={invoice.status} />}
              </div>
              <p className="text-xs text-[#6c757d] mt-0.5">
                Contract: <span className="font-mono text-[#343a40]">{invoice.subscriptionNumber}</span> • Customer: {invoice.customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status === "DRAFT" && (
              <button
                onClick={handleConfirmInvoice}
                className="inline-flex items-center gap-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#d2e3fc] transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm Invoice
              </button>
            )}
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#ceead6] transition-all cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}
            <button
              onClick={handleSendInvoice}
              className="inline-flex items-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#495057] text-xs font-medium px-3 py-2 rounded-xl border border-[#ced4da] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#495057] text-xs font-medium px-3 py-2 rounded-xl border border-[#ced4da] transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <button
                onClick={() => setIsCancelConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] text-xs font-medium px-3 py-2 rounded-xl border border-[#fad2cf] transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Overdue alert */}
        {isOverdue && (
          <div className="bg-[#fce8e6] border border-[#fad2cf] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-[#c5221f] shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#c5221f]">Computed Status: Overdue Invoice</h4>
                <p className="text-xs text-[#495057]">
                  Due date was {invoice.dueDate}. Outstanding balance: ${remainingBalance.toFixed(2)}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="text-xs font-semibold bg-[#c5221f] hover:bg-[#a51d24] text-white px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Collect Now
            </button>
          </div>
        )}

        {/* Printable Invoice Card */}
        <div className="bg-white border border-[#dee2e6] rounded-2xl p-6 sm:p-8 space-y-8 shadow-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[#dee2e6] pb-6 flex-wrap gap-4">
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#212529]">
                Brightloop Software
              </div>
              <p className="text-xs text-[#6c757d] mt-1">100 Tech Blvd, Innovation Tower, Suite 500</p>
              <p className="text-xs text-[#6c757d]">billing@brightloop.com</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#212529] font-mono">{invoice.invoiceNumber}</div>
              <div className="text-xs text-[#6c757d] mt-1">Issue Date: <span className="text-[#212529] font-mono">{invoice.issueDate}</span></div>
              <div className="text-xs text-[#6c757d]">Due Date: <span className="text-[#212529] font-mono">{invoice.dueDate}</span></div>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block font-semibold mb-1">Billed To:</span>
              <div className="text-sm font-bold text-[#212529]">{invoice.customerName}</div>
              <div className="text-[#495057]">{invoice.customerCompany}</div>
              <div className="text-[#6c757d] mt-1">Contract: {invoice.subscriptionNumber}</div>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block font-semibold mb-1">Payment Status:</span>
              <div className="text-base font-bold">
                {invoice.status === "PAID" ? (
                  <span className="text-[#137333]">PAID IN FULL</span>
                ) : (
                  <span className="text-[#b06000]">${remainingBalance.toFixed(2)} OUTSTANDING</span>
                )}
              </div>
              <div className="text-[#6c757d] mt-1">Amount Settled: ${invoice.amountPaid.toFixed(2)}</div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-[#dee2e6] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Quantity</th>
                  <th className="py-3 px-4 font-semibold">Unit Price</th>
                  <th className="py-3 px-4 font-semibold">Discount</th>
                  <th className="py-3 px-4 font-semibold">Tax (18%)</th>
                  <th className="py-3 px-4 font-semibold text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-3.5 px-4 font-medium text-[#212529]">{line.description}</td>
                    <td className="py-3.5 px-4">{line.quantity}</td>
                    <td className="py-3.5 px-4 font-mono">${line.unitPrice.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-[#137333]">
                      {line.discountAmount > 0 ? `-$${line.discountAmount.toFixed(2)}` : "$0.00"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#6c757d]">+${line.taxAmount.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#212529] text-right">
                      ${line.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-between items-start flex-wrap gap-4 pt-4 border-t border-[#dee2e6]">
            <div className="text-xs text-[#6c757d] max-w-sm">
              <p className="text-[11px] leading-relaxed">
                Thank you for your business. For any billing queries, please contact billing@brightloop.com.
              </p>
              {invoice.notes && <p className="mt-2 text-[11px] text-[#495057] italic">{invoice.notes}</p>}
            </div>
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#6c757d]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#212529]">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-[#137333]">
                  <span>Applied Discounts:</span>
                  <span className="font-mono">-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6c757d]">
                <span>GST Tax (18%):</span>
                <span className="font-mono text-[#212529]">+${invoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#dee2e6] text-[#212529]">
                <span>Invoice Total:</span>
                <span className="font-mono">${invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#137333] font-medium pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">${invoice.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#b06000] font-bold pt-1 border-t border-[#dee2e6]">
                <span>Balance Remaining:</span>
                <span className="font-mono">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Record Payment Modal */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment for ${invoice.invoiceNumber}`}
          description={`Outstanding balance: $${remainingBalance.toFixed(2)}. Payments accumulate and update status to PAID once settled.`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Payment Amount ($)</label>
              <input
                type="number" step="0.01" min="0.01" max={remainingBalance} required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputCls}>
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="CARD">CARD</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Transaction / Reference #</label>
              <input type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
                placeholder="WIRE-TXN-29381" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Internal Note</label>
              <textarea rows={2} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="ACH wire received and verified by finance."
                className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs cursor-pointer transition-all">
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={isCancelConfirmOpen}
          onClose={() => setIsCancelConfirmOpen(false)}
          onConfirm={handleCancelInvoice}
          title="Cancel Invoice"
          message={`Are you sure you want to void invoice ${invoice.invoiceNumber}? This action cannot be reversed.`}
          confirmLabel="Cancel Invoice"
          confirmVariant="danger"
        />
      </div>
    </DashboardLayout>
  );
}
