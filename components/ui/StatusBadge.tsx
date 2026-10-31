import React from "react";
import { SubscriptionStatus, InvoiceStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: SubscriptionStatus | InvoiceStatus | "OVERDUE";
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getBadgeStyles = () => {
    switch (status) {
      case "ACTIVE":
      case "PAID":
        return "bg-[#e6f4ea] text-[#137333] border-[#ceead6]";
      case "CONFIRMED":
        return "bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]";
      case "QUOTATION":
        return "bg-[#fef7e0] text-[#b06000] border-[#feefc3]";
      case "DRAFT":
        return "bg-[#e9ecef] text-[#495057] border-[#ced4da]";
      case "CLOSED":
        return "bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]";
      case "CANCELLED":
        return "bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]";
      case "OVERDUE":
        return "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf] font-bold animate-pulse";
      default:
        return "bg-[#e9ecef] text-[#343a40] border-[#ced4da]";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getBadgeStyles()} ${className}`}
    >
      {status}
    </span>
  );
}
