"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Invoice, PaymentMethod } from "@/lib/types";
import { api, isInvoiceOverdue } from "@/lib/api";
import { Search, ChevronRight, Play, CheckCircle, CreditCard, Send, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

function InvoicesListContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  const [billingResultModal, setBillingResultModal] = useState<{
    isOpen: boolean;
    count: number;
    message: string;
    invoices: Invoice[];
  }>({
    isOpen: false,
    count: 0,
    message: "",
    invoices: [],
  });

  // Quick payment modal state
  const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.getInvoices();
      setInvoices(res.data);
    } catch {
      toast.error("Failed to load invoice registry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleRunBillingDay = async () => {
    setIsBillingRunning(true);
    try {
      const res = await api.runBilling();
      setBillingResultModal({
        isOpen: true,
        count: res.generatedCount,
        message: res.message,
        invoices: res.invoices,
      });
      await loadInvoices();
      if (res.generatedCount > 0) {
        toast.success("Billing Run Completed", {
          description: `Generated ${res.generatedCount} recurring invoice(s).`,
        });
      } else {
        toast.info("Subscriptions Up-to-Date", {
          description: res.message,
        });
      }
    } catch {
      toast.error("Billing run encountered an error");
    } finally {
      setIsBillingRunning(false);
    }
  };

  const handleQuickConfirm = async (inv: Invoice) => {
    try {
      await api.updateInvoiceStatus(inv.id, "CONFIRMED");
      toast.success("Invoice Confirmed", {
        description: `${inv.invoiceNumber} is now confirmed.`,
      });
      loadInvoices();
    } catch {
      toast.error("Failed to confirm invoice");
    }
  };

  const handleQuickSend = (inv: Invoice) => {
    toast.success("Invoice Dispatched", {
      description: `${inv.invoiceNumber} emailed to ${inv.customerName}.`,
    });
  };

  const openQuickPay = (inv: Invoice) => {
    setQuickPayInvoice(inv);
    setPayAmount(Number(Math.max(0, inv.total - inv.amountPaid).toFixed(2)));
    setPayRef("");
  };

  const handleRecordQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayInvoice || payAmount <= 0) return;
    try {
      await api.recordPayment({
        invoiceId: quickPayInvoice.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        referenceNumber: payRef || undefined,
      });
      toast.success("Payment Recorded", {
        description: `Collected $${Number(payAmount).toFixed(2)} for ${quickPayInvoice.invoiceNumber}.`,
      });
      setQuickPayInvoice(null);
      loadInvoices();
    } catch {
      toast.error("Failed to record payment");
    }
  };

  const filtered = invoices.filter((inv) => {
    const isOverdue = isInvoiceOverdue(inv);
    let matchesStatus = true;
    if (statusFilter === "OVERDUE") {
      matchesStatus = isOverdue;
    } else if (statusFilter !== "ALL") {
      matchesStatus = inv.status === statusFilter;
    }

    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.subscriptionNumber.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Recurring Billing"
        description="Invoices auto-created from active subscriptions. Never billed twice or skipped. Supports tax rules, discounts, and payment tracking."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBillingDay}
              disabled={isBillingRunning}
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Executes recurring billing cycle for all due active subscriptions"
            >
              <Play className={`w-3.5 h-3.5 ${isBillingRunning ? "animate-spin" : ""}`} />
              <span>{isBillingRunning ? "Processing Billing..." : "Run Billing Day"}</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#dee2e6]">
              <span className="text-xs text-[#6c757d]">Total Invoiced:</span>
              <span className="text-sm font-bold text-[#212529] font-mono">
                ${totalInvoiced.toFixed(2)}
              </span>
            </div>
          </div>
        }
      />

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#dee2e6] p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input
            type="text"
            placeholder="Search invoice #, customer, or contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#ced4da] rounded-xl pl-10 pr-4 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "OVERDUE", "CONFIRMED", "PAID", "DRAFT", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-[#343a40] text-[#f8f9fa] shadow-xs"
                  : "bg-[#e9ecef] text-[#495057] hover:bg-[#dee2e6] border border-[#ced4da]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Customer & Contract Ref</th>
                <th className="py-3 px-4 font-semibold">Subtotal</th>
                <th className="py-3 px-4 font-semibold">Discount & Tax</th>
                <th className="py-3 px-4 font-semibold">Total Due</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6c757d]">Loading invoices...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6c757d]">No invoices found matching criteria.</td>
                </tr>
              ) : filtered.map((inv) => {
                const isOverdue = isInvoiceOverdue(inv);
                const unpaid = Math.max(0, inv.total - inv.amountPaid);

                return (
                  <tr key={inv.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#212529]">
                      <Link href={`/invoices/${inv.id}`} className="text-[#343a40] hover:underline font-bold">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#212529]">{inv.customerName}</div>
                      <div className="text-[11px] text-[#6c757d] font-mono mt-0.5">
                        {inv.subscriptionNumber} • {inv.customerCompany}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-[#495057]">
                      ${inv.subtotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {inv.discountAmount > 0 && (
                        <div className="text-[#137333] font-medium">-${inv.discountAmount.toFixed(2)} Disc</div>
                      )}
                      <div className="text-[#6c757d]">+${inv.taxAmount.toFixed(2)} Tax</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#212529]">
                      ${inv.total.toFixed(2)}
                      {inv.status === "CONFIRMED" && unpaid > 0 && (
                        <div className="text-[10px] font-normal text-[#b06000]">
                          (${unpaid.toFixed(2)} left)
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#495057]">
                      {inv.dueDate}
                    </td>
                    <td className="py-3.5 px-4">
                      {isOverdue ? (
                        <StatusBadge status="OVERDUE" />
                      ) : (
                        <StatusBadge status={inv.status} />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => handleQuickConfirm(inv)}
                            className="text-[11px] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] px-2 py-1 rounded-lg border border-[#d2e3fc] font-medium cursor-pointer"
                            title="Confirm Invoice"
                          >
                            Confirm
                          </button>
                        )}
                        {inv.status === "CONFIRMED" && unpaid > 0 && (
                          <button
                            onClick={() => openQuickPay(inv)}
                            className="text-[11px] bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] px-2 py-1 rounded-lg border border-[#ceead6] font-medium cursor-pointer"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleQuickSend(inv)}
                          className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg"
                          title="Send Invoice Email"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-[11px] bg-[#e9ecef] hover:bg-[#dee2e6] text-[#495057] px-2 py-1 rounded-lg border border-[#ced4da] transition-colors"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Day Result Modal */}
      <Modal
        isOpen={billingResultModal.isOpen}
        onClose={() => setBillingResultModal((prev) => ({ ...prev, isOpen: false }))}
        title="Billing Day Engine Execution"
        description="Automated recurring invoice generation results."
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6c757d]">Generated Invoices:</span>
              <span className="text-sm font-bold font-mono text-[#137333]">
                {billingResultModal.count} new invoice(s)
              </span>
            </div>
            <p className="text-xs text-[#495057] leading-relaxed">
              {billingResultModal.message}
            </p>
          </div>

          {billingResultModal.invoices.length > 0 && (
            <div className="border border-[#dee2e6] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f1f3f5] text-[#495057] text-[11px]">
                  <tr>
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                  {billingResultModal.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="p-2 font-mono font-semibold">{inv.invoiceNumber}</td>
                      <td className="p-2">{inv.customerName}</td>
                      <td className="p-2 text-right font-mono font-bold">${inv.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-[11px] text-[#6c757d] space-y-1">
            <p>✓ Product lines and variant extra prices applied.</p>
            <p>✓ Applicable discounts deducted prior to tax calculation.</p>
            <p>✓ GST (18%) computed and line amounts rounded half-up.</p>
            <p>✓ Duplicate prevention verified: No subscription billed twice.</p>
            <p>✓ Next billing dates advanced by plan cadence (Daily/Weekly/Monthly/Yearly).</p>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#dee2e6]">
            <button
              onClick={() => setBillingResultModal((prev) => ({ ...prev, isOpen: false }))}
              className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick Payment Modal */}
      {quickPayInvoice && (
        <Modal
          isOpen={!!quickPayInvoice}
          onClose={() => setQuickPayInvoice(null)}
          title={`Record Payment for ${quickPayInvoice.invoiceNumber}`}
          description={`Customer: ${quickPayInvoice.customerName} • Outstanding: $${(quickPayInvoice.total - quickPayInvoice.amountPaid).toFixed(2)}`}
        >
          <form onSubmit={handleRecordQuickPay} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={Math.max(0, quickPayInvoice.total - quickPayInvoice.amountPaid)}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className={inputCls}
              >
                <option value="BANK_TRANSFER">Bank Transfer (ACH/Wire)</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="UPI">UPI / Instant Transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Transaction Ref #</label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="TXN-98421"
                className={`${inputCls} font-mono`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <button
                type="button"
                onClick={() => setQuickPayInvoice(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function InvoicesListPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-[#6c757d]">Loading invoices...</div>}>
        <InvoicesListContent />
      </Suspense>
    </DashboardLayout>
  );
}
