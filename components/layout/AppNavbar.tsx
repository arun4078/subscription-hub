"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RefreshCw, Play, LogOut, Shield, Menu } from "lucide-react";
import { toast } from "sonner";

interface AppNavbarProps {
  onToggleSidebar?: () => void;
}

export function AppNavbar({ onToggleSidebar }: AppNavbarProps) {
  const { user, role, logout } = useAuth();
  const [isBillingRunning, setIsBillingRunning] = useState(false);

  const handleRunBilling = async () => {
    setIsBillingRunning(true);
    try {
      const res = await api.runBilling();
      if (res.generatedCount > 0) {
        toast.success("Billing Run Completed", {
          description: res.message,
        });
      } else {
        toast.info("Billing Verification Complete", {
          description: res.message,
        });
      }
    } catch {
      toast.error("Failed to execute billing engine");
    } finally {
      setIsBillingRunning(false);
    }
  };

  return (
    <header className="border-b border-[#dee2e6] bg-white/95 backdrop-blur-md sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 justify-between gap-4 shadow-xs">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-[#6c757d] hover:text-[#212529] p-1 rounded-lg"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#343a40] via-[#495057] to-[#212529] flex items-center justify-center shadow-md shadow-[#343a40]/20 group-hover:scale-105 transition-transform">
            <RefreshCw className="w-4 h-4 text-[#f8f9fa]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-[#212529]">Brightloop</span>
          </div>
        </Link>
      </div>

      {/* Right: Actions, User Role & Profile */}
      <div className="flex items-center gap-3">
        {/* Run Billing Button */}
        <button
          onClick={handleRunBilling}
          disabled={isBillingRunning}
          className="hidden sm:inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          title="Executes recurring billing cycle for all due active subscriptions"
        >
          <Play className={`w-3.5 h-3.5 ${isBillingRunning ? "animate-spin" : ""}`} />
          {isBillingRunning ? "Running..." : "Run Billing"}
        </button>

        {/* User Info & Authoritative Role Badge */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#dee2e6]">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#212529]">{user.name}</div>
              <div className="text-[11px] text-[#6c757d]">{user.email}</div>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                role === "ADMIN"
                  ? "bg-[#343a40] text-[#f8f9fa] border-[#212529]"
                  : "bg-[#e9ecef] text-[#343a40] border-[#ced4da]"
              }`}
            >
              <Shield className="w-3 h-3" />
              {role}
            </span>

            <button
              onClick={logout}
              className="text-[#6c757d] hover:text-[#b91c1c] hover:bg-[#e9ecef] p-2 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
