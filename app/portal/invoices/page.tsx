"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, isInvoiceOverdue } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Invoice } from "@/lib/types";
import { ChevronRight, FileText, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function CustomerPortalInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await api.getInvoices();
        const userEmail = user?.email?.toLowerCase().trim();
        const userName = user?.name?.toLowerCase().trim();
        const userId = user?.id;

        // Customer portal: ONLY show invoices belonging to this customer
        const own = res.data.filter((i) => {
          if (userId && (i.customerId === userId || i.customerId === `cust-${userId}`)) {
            return true;
          }
          if (userEmail && i.customerEmail && i.customerEmail.toLowerCase().trim() === userEmail) {
            return true;
          }
          if (userName && i.customerName && i.customerName.toLowerCase().trim() === userName) {
            return true;
          }
          return false;
        });

        // New customers start with empty invoices until they purchase a plan
        setInvoices(own);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Invoices & Receipts"
        description="Review billing statements, verify tax charges, pay online, and print official statements."
      />

      <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6c757d]">
            Loading invoice records...
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f3f5] border border-[#dee2e6] flex items-center justify-center mx-auto mb-4 text-[#6c757d]">
              <FileText className="w-7 h-7 text-[#495057]" />
            </div>
            <h3 className="text-base font-semibold text-[#212529]">No Invoices Yet</h3>
            <p className="text-xs text-[#6c757d] max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
              As a new customer, you do not have any invoices or payment receipts yet. When you purchase a subscription plan, your billing statements will be recorded here.
            </p>
            <Link
              href="/portal/plans"
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Plans Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Contract Ref</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">View / Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                {invoices.map((inv) => {
                  const isOverdue = isInvoiceOverdue(inv);

                  return (
                    <tr key={inv.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#212529]">
                        <Link href={`/portal/invoices/${inv.id}`} className="hover:underline text-[#343a40]">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#343a40]">
                        {inv.subscriptionNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#6c757d]">
                        {inv.issueDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#495057]">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#212529]">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOverdue ? (
                          <StatusBadge status="OVERDUE" />
                        ) : (
                          <StatusBadge status={inv.status} />
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[#343a40] hover:text-[#212529] bg-[#e9ecef] hover:bg-[#dee2e6] border border-[#ced4da] px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>Statement</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
