"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { Subscription } from "@/lib/types";
import { ArrowLeft, Pause, Play, RotateCw, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerPortalSubscriptionDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const loadSub = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSubscriptionById(resolvedParams.id);
      setSub(res.data);
    } catch {
      toast.error("Subscription details not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSub();
  }, [resolvedParams.id]);

  const handlePause = async () => {
    if (!sub) return;
    try {
      const updated = await api.transitionSubscriptionStatus(sub.id, "CLOSED");
      setSub(updated.data);
      toast.info("Subscription Paused", {
        description: "Your recurring billing has been temporarily suspended.",
      });
    } catch {
      toast.error("Failed to pause subscription");
    }
  };

  const handleResume = async () => {
    if (!sub) return;
    try {
      const updated = await api.transitionSubscriptionStatus(sub.id, "ACTIVE");
      setSub(updated.data);
      toast.success("Subscription Resumed", {
        description: "Your recurring subscription is now active.",
      });
    } catch {
      toast.error("Failed to resume subscription");
    }
  };

  const handleRenew = async () => {
    if (!sub) return;
    try {
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingPeriod === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
      else if (sub.billingPeriod === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
      else if (sub.billingPeriod === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.billingPeriod === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

      const updated = await api.updateSubscription(sub.id, {
        nextBillingDate: nextDate.toISOString().split("T")[0],
        status: "ACTIVE",
      });
      setSub(updated.data);
      toast.success("Subscription Renewed", {
        description: `Contract successfully renewed. Next billing date: ${nextDate.toISOString().split("T")[0]}.`,
      });
    } catch {
      toast.error("Failed to renew subscription");
    }
  };

  const handleCancel = async () => {
    if (!sub) return;
    try {
      const updated = await api.transitionSubscriptionStatus(sub.id, "CLOSED");
      setSub(updated.data);
      setIsCancelConfirmOpen(false);
      toast.warning("Subscription Cancelled", {
        description: "Your subscription has been closed.",
      });
    } catch {
      toast.error("Failed to cancel subscription");
    }
  };

  if (isLoading || !sub) {
    return <div className="text-[#6c757d] p-8 text-center">Loading subscription...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/subscriptions"
            className="p-2 rounded-xl bg-white border border-[#dee2e6] text-[#6c757d] hover:text-[#212529] hover:bg-[#e9ecef] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <PageHeader
            title={`Subscription ${sub.subscriptionNumber}`}
            description={`Plan: ${sub.planName} • Cadence: ${sub.billingPeriod}`}
          />
        </div>

        {/* Customer Self-Service Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {sub.status === "ACTIVE" && sub.pausable && (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#343a40] text-xs font-semibold px-3 py-2 rounded-xl border border-[#ced4da] transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause Plan
            </button>
          )}

          {sub.status === "CLOSED" && (
            <button
              onClick={handleResume}
              className="inline-flex items-center gap-1.5 bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] text-xs font-semibold px-3 py-2 rounded-xl border border-[#ceead6] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Resume Subscription
            </button>
          )}

          {sub.status === "ACTIVE" && (
            <button
              onClick={handleRenew}
              className="inline-flex items-center gap-1.5 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Renew Contract
            </button>
          )}

          {sub.status === "ACTIVE" && (
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] text-xs font-semibold px-3 py-2 rounded-xl border border-[#fad2cf] transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Subscription
            </button>
          )}

          <Link
            href="/portal/invoices"
            className="inline-flex items-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#495057] text-xs font-medium px-3 py-2 rounded-xl border border-[#ced4da] transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            My Invoices
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xs">
        <div>
          <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block font-semibold">Contract Value</span>
          <div className="text-2xl font-bold text-[#137333] font-mono mt-1">${sub.totalAmount.toFixed(2)}</div>
          <div className="mt-2">
            <StatusBadge status={sub.status} />
          </div>
        </div>

        <div>
          <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block font-semibold">Next Invoicing Date</span>
          <div className="text-base font-semibold text-[#212529] font-mono mt-1">{sub.nextBillingDate}</div>
          <div className="text-xs text-[#6c757d] mt-1">Payment Terms: {sub.paymentTerms}</div>
        </div>

        <div>
          <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block font-semibold">Contract Effective Period</span>
          <div className="text-xs text-[#212529] mt-1 font-medium">Started: {sub.startDate}</div>
          <div className="text-xs text-[#6c757d] mt-1">Expiry: {sub.expiryDate || "Continuous Renewal"}</div>
        </div>
      </div>

      {/* Licensed Inclusions */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-semibold text-[#212529]">Licensed Products &amp; Services</h3>
        <div className="space-y-2">
          {sub.lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between p-3.5 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] text-xs"
            >
              <div>
                <span className="font-semibold text-[#212529]">{line.productName}</span>
                {line.variantName && (
                  <span className="ml-2 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full border border-[#d2e3fc]">
                    {line.variantName} (+${line.variantExtra})
                  </span>
                )}
              </div>
              <div className="font-mono text-[#212529] font-bold">
                {line.quantity} seat(s) • ${line.lineSubtotal.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-[#dee2e6]">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#6c757d]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#212529]">${sub.subtotal.toFixed(2)}</span>
            </div>
            {sub.discountTotal > 0 && (
              <div className="flex justify-between text-[#137333]">
                <span>Applied Discount:</span>
                <span className="font-mono">-${sub.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6c757d]">
              <span>GST Tax (18%):</span>
              <span className="font-mono text-[#212529]">+${sub.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#dee2e6] text-[#212529]">
              <span>Total / Billing Cycle:</span>
              <span className="font-mono text-[#137333]">${sub.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Your Subscription"
        message="Are you sure you want to cancel your recurring subscription? You can resume it anytime from your portal."
        confirmLabel="Cancel Subscription"
        confirmVariant="danger"
      />
    </div>
  );
}
