"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { RefreshCw, Layers, FileText, ShoppingBag, LogOut, Laptop } from "lucide-react";

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, deviceInfo, isRecognizedDevice } = useAuth();

  return (
    <RoleGuard allowedRoles={["CUSTOMER", "ADMIN"]}>
      <div className="min-h-screen bg-[#f8f9fa] text-[#212529] flex flex-col font-sans">
        {/* Portal Header */}
        <header className="border-b border-[#dee2e6] bg-white sticky top-0 z-30 h-16 flex items-center px-4 sm:px-8 justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#343a40] via-[#495057] to-[#212529] flex items-center justify-center shadow-md shadow-[#343a40]/20">
              <RefreshCw className="w-4 h-4 text-[#f8f9fa]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#212529]">Brightloop</span>
                <span className="text-[10px] font-semibold bg-[#e9ecef] text-[#343a40] border border-[#ced4da] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Customer Portal
                </span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/portal/plans"
              className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all ${
                pathname.startsWith("/portal/plans")
                  ? "bg-[#343a40] text-[#f8f9fa] font-semibold"
                  : "text-[#495057] hover:text-[#212529] hover:bg-[#e9ecef]"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Purchase Plans</span>
            </Link>
            <Link
              href="/portal/subscriptions"
              className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all ${
                pathname.startsWith("/portal/subscriptions")
                  ? "bg-[#343a40] text-[#f8f9fa] font-semibold"
                  : "text-[#495057] hover:text-[#212529] hover:bg-[#e9ecef]"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Subscriptions</span>
            </Link>
            <Link
              href="/portal/invoices"
              className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all ${
                pathname.startsWith("/portal/invoices")
                  ? "bg-[#343a40] text-[#f8f9fa] font-semibold"
                  : "text-[#495057] hover:text-[#212529] hover:bg-[#e9ecef]"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Invoices</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isRecognizedDevice && deviceInfo && (
              <div
                className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8]"
                title={`Device ID: ${deviceInfo.deviceId}`}
              >
                <Laptop className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Device: {deviceInfo.deviceName}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" title="Device recognized via cookies"></span>
              </div>
            )}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#212529]">{user?.name}</div>
              <div className="text-[11px] text-[#6c757d] font-mono">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="text-[#6c757d] hover:text-[#b91c1c] hover:bg-[#e9ecef] p-2 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>

        <footer className="border-t border-[#dee2e6] bg-white py-4 px-6 text-xs text-[#6c757d] text-center shadow-xs">
          Brightloop Customer Portal • Subscriptions &amp; Invoices
        </footer>
      </div>
    </RoleGuard>
  );
}
