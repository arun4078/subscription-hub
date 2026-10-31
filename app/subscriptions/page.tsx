"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Subscription, SubscriptionStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { Plus, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

function SubscriptionsListContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status") || "ALL";

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusParam);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSubscriptions();
      setSubscriptions(res.data);
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleStatusTransition = async (subId: string, nextStatus: SubscriptionStatus) => {
    try {
      await api.transitionSubscriptionStatus(subId, nextStatus);
      toast.success("Subscription Status Updated", {
        description: `Contract ${subId} transitioned to ${nextStatus}.`,
      });
      loadSubscriptions();
    } catch {
      toast.error("Status transition failed");
    }
  };

  const filtered = subscriptions.filter((s) => {
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    const matchesSearch =
      s.subscriptionNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.customerCompany.toLowerCase().includes(search.toLowerCase()) ||
      s.planName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage lifecycle statuses (Draft → Quotation → Confirmed → Active → Closed) and configure recurring contracts."
        actions={
          <Link
            href="/subscriptions/new"
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Subscription
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#dee2e6] p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
          <input
            type="text"
            placeholder="Search contract #, customer, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#ced4da] rounded-xl pl-10 pr-4 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"].map((st) => (
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

      {/* Subscriptions Table */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
              <tr>
                <th className="py-3 px-4 font-semibold">Contract / Ref</th>
                <th className="py-3 px-4 font-semibold">Customer & Company</th>
                <th className="py-3 px-4 font-semibold">Plan & Cadence</th>
                <th className="py-3 px-4 font-semibold">Next Billing</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6c757d]">Loading subscriptions...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6c757d]">No subscriptions found.</td>
                </tr>
              ) : filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/subscriptions/${sub.id}`}
                      className="font-mono font-semibold text-[#343a40] hover:underline"
                    >
                      {sub.subscriptionNumber}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#212529]">{sub.customerName}</div>
                    <div className="text-[11px] text-[#6c757d]">{sub.customerCompany}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[#212529] font-medium">{sub.planName}</div>
                    <span className="text-[10px] bg-[#e9ecef] text-[#495057] px-1.5 py-0.5 rounded border border-[#ced4da]">
                      {sub.billingPeriod}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#495057]">
                    {sub.nextBillingDate}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#212529]">
                    ${sub.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {sub.status === "DRAFT" && (
                        <button
                          onClick={() => handleStatusTransition(sub.id, "QUOTATION")}
                          className="text-[11px] bg-[#fef7e0] hover:bg-[#feefc3] text-[#b06000] px-2 py-1 rounded-lg border border-[#feefc3] transition-colors cursor-pointer"
                        >
                          Send Quote
                        </button>
                      )}
                      {sub.status === "QUOTATION" && (
                        <button
                          onClick={() => handleStatusTransition(sub.id, "CONFIRMED")}
                          className="text-[11px] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] px-2 py-1 rounded-lg border border-[#d2e3fc] transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                      {sub.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleStatusTransition(sub.id, "ACTIVE")}
                          className="text-[11px] bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] px-2 py-1 rounded-lg border border-[#ceead6] transition-colors cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                      {sub.status === "ACTIVE" && (
                        <button
                          onClick={() => handleStatusTransition(sub.id, "CLOSED")}
                          className="text-[11px] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] px-2 py-1 rounded-lg border border-[#fad2cf] transition-colors cursor-pointer"
                        >
                          Close
                        </button>
                      )}
                      <Link
                        href={`/subscriptions/${sub.id}`}
                        className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionsListPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-[#6c757d]">Loading subscriptions...</div>}>
        <SubscriptionsListContent />
      </Suspense>
    </DashboardLayout>
  );
}
