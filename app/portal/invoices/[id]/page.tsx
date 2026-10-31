"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { api, isInvoiceOverdue } from "@/lib/api";
import { Invoice, PaymentMethod } from "@/lib/types";
import { ArrowLeft, Printer, CreditCard, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerPortalInvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CARD");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [isPaying, setIsPaying] = useState(false);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await api.getInvoiceById(resolvedParams.id);
      setInvoice(res.data);
    } catch {
      toast.error("Invoice statement not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [resolvedParams.id]);

  const handleCustomerPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const remaining = Math.max(0, invoice.total - invoice.amountPaid);
    setIsPaying(true);
    try {
      await api.recordPayment({
        invoiceId: invoice.id,
        amount: remaining,
        paymentMethod: payMethod,
        referenceNumber: `CUST-PAY-${Date.now().toString().slice(-6)}`,
        notes: `Paid online by customer via ${payMethod}.`,
      });
      toast.success("Payment Successful!", {
        description: `Successfully settled balance of $${remaining.toFixed(2)}. Your invoice is now marked PAID.`,
      });
      setIsPayModalOpen(false);
      loadInvoice();
    } catch {
      toast.error("Payment processing failed");
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading || !invoice) {
    return <div className="text-[#6c757d] p-8 text-center">Loading statement...</div>;
  }

  const isOverdue = isInvoiceOverdue(invoice);
  const remaining = Math.max(0, invoice.total - invoice.amountPaid);
  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/invoices"
            className="p-2 rounded-xl bg-white border border-[#dee2e6] text-[#6c757d] hover:text-[#212529] hover:bg-[#e9ecef] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <PageHeader
            title={`Invoice ${invoice.invoiceNumber}`}
            description={`Contract: ${invoice.subscriptionNumber}`}
          />
        </div>

        <div className="flex items-center gap-2">
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Now (${remaining.toFixed(2)})</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] text-xs font-semibold px-4 py-2 rounded-xl border border-[#ced4da] transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Printable Receipt Box */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex justify-between items-start border-b border-[#dee2e6] pb-6 flex-wrap gap-4">
          <div>
            <div className="text-xl font-bold text-[#212529]">Brightloop Software</div>
            <div className="text-xs text-[#6c757d] mt-1">Invoice Statement &amp; Tax Receipt</div>
            <div className="text-xs text-[#6c757d]">100 Tech Blvd, Innovation Tower, Suite 500</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-[#212529]">{invoice.invoiceNumber}</div>
            <div className="text-xs text-[#6c757d] mt-1">Issue Date: {invoice.issueDate}</div>
            <div className="text-xs text-[#6c757d]">Due Date: {invoice.dueDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 text-xs">
          <div>
            <span className="text-[#6c757d] block mb-0.5">Billed To:</span>
            <span className="font-semibold text-[#212529]">{invoice.customerName}</span>
            <div className="text-[#495057]">{invoice.customerCompany}</div>
            <div className="text-[#6c757d] mt-1">Contract: {invoice.subscriptionNumber}</div>
          </div>
          <div className="text-right">
            <span className="text-[#6c757d] block mb-0.5">Payment Status:</span>
            <div className="mt-1">
              {isOverdue ? (
                <StatusBadge status="OVERDUE" />
              ) : (
                <StatusBadge status={invoice.status} />
              )}
            </div>
            {invoice.status === "PAID" ? (
              <span className="text-xs font-semibold text-[#137333] mt-1 block">Paid in Full</span>
            ) : (
              <span className="text-xs font-semibold text-[#b06000] mt-1 block font-mono">
                ${remaining.toFixed(2)} Balance Remaining
              </span>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="border border-[#dee2e6] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f3f5] text-[#495057] text-[11px] uppercase tracking-wider border-b border-[#dee2e6]">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Unit Price</th>
                <th className="py-2.5 px-3">Discount</th>
                <th className="py-2.5 px-3">Tax</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 px-3 font-medium text-[#212529]">{l.description}</td>
                  <td className="py-3 px-3">{l.quantity}</td>
                  <td className="py-3 px-3 font-mono">${l.unitPrice.toFixed(2)}</td>
                  <td className="py-3 px-3 font-mono text-[#137333]">
                    {l.discountAmount > 0 ? `-$${l.discountAmount.toFixed(2)}` : "$0.00"}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#6c757d]">+${l.taxAmount.toFixed(2)}</td>
                  <td className="py-3 px-3 font-mono font-bold text-right text-[#212529]">
                    ${l.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-start flex-wrap gap-4 pt-4 border-t border-[#dee2e6]">
          <div className="text-xs text-[#6c757d] max-w-sm">
            <p>Thank you for subscribing to Brightloop Software.</p>
            <p className="mt-1">For billing questions, please contact billing@brightloop.com.</p>
          </div>

          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#6c757d]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#212529]">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-[#137333]">
                <span>Discounts:</span>
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
            <div className="flex justify-between text-xs text-[#137333] pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">${invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-[#dee2e6] text-[#b06000]">
              <span>Amount Due:</span>
              <span className="font-mono">${remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Online Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Pay Invoice ${invoice.invoiceNumber}`}
        description={`Secure online payment of $${remaining.toFixed(2)} for ${invoice.customerCompany}.`}
      >
        <form onSubmit={handleCustomerPay} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Select Payment Method</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className={inputCls}
            >
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Wire / ACH</option>
              <option value="UPI">UPI / Instant Pay</option>
            </select>
          </div>

          {payMethod === "CARD" && (
            <div className="space-y-3 p-3.5 bg-[#f8f9fa] rounded-xl border border-[#dee2e6]">
              <div>
                <label className="block text-[11px] text-[#6c757d] mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Expires</label>
                  <input type="text" defaultValue="12/28" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">CVC</label>
                  <input type="text" defaultValue="842" className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-[#e6f4ea] border border-[#ceead6] rounded-xl flex items-center justify-between text-xs text-[#137333]">
            <span>Amount to be charged:</span>
            <span className="font-mono font-bold text-sm">${remaining.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPaying}
              className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isPaying ? "Processing..." : `Pay $${remaining.toFixed(2)}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
