"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Subscription } from "@/lib/types";
import { ChevronRight, Plus, Layers, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function CustomerPortalSubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getSubscriptions();
        const userEmail = user?.email?.toLowerCase().trim();
        const userName = user?.name?.toLowerCase().trim();
        const userId = user?.id;

        // Customer portal: ONLY show subscriptions purchased by this customer
        const own = res.data.filter((s) => {
          if (userEmail && s.customerEmail && s.customerEmail.toLowerCase().trim() === userEmail) {
            return true;
          }
          if (userId && (s.customerId === userId || s.customerId === `cust-${userId}`)) {
            return true;
          }
          if (userName && s.customerName && s.customerName.toLowerCase().trim() === userName) {
            return true;
          }
          return false;
        });

        // New customers start with empty subscriptions until they make a purchase
        setSubscriptions(own);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subscriptions"
        description="View and manage active software licenses, service tiers, and contract renewal dates."
        actions={
          <Link
            href="/portal/plans"
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Purchase New Plan</span>
          </Link>
        }
      />

      <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6c757d]">
            Loading subscriptions...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f3f5] border border-[#dee2e6] flex items-center justify-center mx-auto mb-4 text-[#6c757d]">
              <Layers className="w-7 h-7 text-[#495057]" />
            </div>
            <h3 className="text-base font-semibold text-[#212529]">No Subscriptions Yet</h3>
            <p className="text-xs text-[#6c757d] max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
              As a new customer, you do not have any active subscriptions or service plans. Explore our catalog to choose a plan and start your subscription.
            </p>
            <Link
              href="/portal/plans"
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse &amp; Purchase Plans</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Subscription #</th>
                  <th className="py-3 px-4 font-semibold">Service / Plan</th>
                  <th className="py-3 px-4 font-semibold">Billing Frequency</th>
                  <th className="py-3 px-4 font-semibold">Next Invoice Date</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#212529]">
                      <Link href={`/portal/subscriptions/${sub.id}`} className="hover:underline text-[#343a40]">
                        {sub.subscriptionNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#212529]">{sub.planName}</td>
                    <td className="py-3.5 px-4 font-mono text-[#495057]">{sub.billingPeriod}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#495057]">
                      {sub.nextBillingDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#137333]">
                      ${sub.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-[#343a40] hover:text-[#212529] bg-[#e9ecef] hover:bg-[#dee2e6] border border-[#ced4da] px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
