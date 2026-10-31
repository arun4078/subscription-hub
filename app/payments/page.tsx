"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Payment, Invoice, PaymentMethod } from "@/lib/types";
import { api } from "@/lib/api";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [paysRes, invsRes] = await Promise.all([api.getPayments(), api.getInvoices()]);
      setPayments(paysRes.data);
      setInvoices(invsRes.data);
      const unpaid = invsRes.data.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");
      if (unpaid.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(unpaid[0].id);
        setAmount(Number((unpaid[0].total - unpaid[0].amountPaid).toFixed(2)));
      }
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setAmount(Number(Math.max(0, inv.total - inv.amountPaid).toFixed(2)));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || amount <= 0) return;

    try {
      await api.recordPayment({
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        paymentMethod,
        referenceNumber: refNumber || undefined,
        notes: notes || undefined,
      });
      toast.success("Payment Successfully Recorded", {
        description: `Settled $${Number(amount).toFixed(2)} on invoice.`,
      });
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Failed to record payment");
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Payments Registry"
          description="Track incoming customer payments across Cash, Card, Bank Transfer, UPI, and Other channels. Payments update invoice balances automatically."
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </button>
          }
        />

        {/* Filter bar and Total Collected Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#dee2e6] p-4 rounded-2xl shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              placeholder="Search payment #, invoice, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#ced4da] rounded-xl pl-10 pr-4 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6c757d]">Total Collected:</span>
            <span className="font-mono font-bold text-[#137333] text-sm">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Payment #</th>
                  <th className="py-3 px-4 font-semibold">Invoice Ref</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Method</th>
                  <th className="py-3 px-4 font-semibold">Reference #</th>
                  <th className="py-3 px-4 font-semibold">Payment Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6c757d]">Loading payments...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6c757d]">No payments recorded.</td>
                  </tr>
                ) : filtered.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#212529]">
                      {pay.paymentNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/invoices/${pay.invoiceId}`}
                        className="text-[#343a40] font-mono hover:underline"
                      >
                        {pay.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#212529]">{pay.customerName}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-[#e9ecef] text-[#495057] px-2 py-0.5 rounded text-[10px] font-semibold border border-[#ced4da]">
                        {pay.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6c757d]">
                      {pay.referenceNumber || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6c757d]">
                      {pay.paymentDate.split("T")[0]}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#137333] text-right">
                      +${pay.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Payment Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record Customer Payment"
          description="Match an incoming bank transfer, card, or cash remittance to an invoice."
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Target Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] font-mono transition-all"
              >
                {invoices
                  .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName} (${(inv.total - inv.amountPaid).toFixed(2)} unpaid)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] font-mono transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CARD">CARD</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">CASH</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Transaction Reference #</label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="TXN-998124"
                className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Direct deposit confirmation received..."
                className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              >
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
