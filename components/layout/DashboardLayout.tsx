"use client";

import React, { useState } from "react";
import { AppNavbar } from "./AppNavbar";
import { AppSidebar } from "./AppSidebar";
import { RoleGuard } from "./RoleGuard";
import { Role } from "@/lib/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function DashboardLayout({
  children,
  allowedRoles = ["ADMIN", "STAFF"],
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-[#f8f9fa] text-[#212529] flex flex-col font-sans">
        <AppNavbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <div className="flex flex-1">
          <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 md:pl-64 flex flex-col">
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {children}
            </main>
            <footer className="border-t border-[#dee2e6] bg-white py-4 px-6 text-xs text-[#6c757d] flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
              <div>Brightloop • Subscription Management Platform</div>
              <div>© 2026 Brightloop Software. All rights reserved.</div>
            </footer>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
