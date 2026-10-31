"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  UserCheck,
  Package,
  CalendarDays,
  Percent,
  Tag,
  FileCheck2,
  Users,
  Layers,
  FileText,
  CreditCard,
  FileEdit,
  Shield,
  LucideIcon,
} from "lucide-react";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

function SidebarNavList({
  navItems,
  onClose,
}: {
  navItems: NavItem[];
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;

        let isActive = false;
        if (item.href === "/dashboard") {
          isActive = pathname === "/dashboard";
        } else if (item.href.includes("status=QUOTATION")) {
          // Quotations tab: active ONLY when on /subscriptions with status=QUOTATION
          isActive = pathname === "/subscriptions" && statusParam === "QUOTATION";
        } else if (item.href === "/subscriptions") {
          // Subscriptions tab: active when on /subscriptions but NOT QUOTATION status
          isActive = pathname.startsWith("/subscriptions") && statusParam !== "QUOTATION";
        } else {
          isActive = pathname.startsWith(item.href);
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? "bg-[#343a40] text-[#f8f9fa] font-semibold shadow-xs"
                : "text-[#495057] hover:text-[#212529] hover:bg-[#e9ecef]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const { role } = useAuth();

  // C. ADMIN NAVIGATION
  const adminNav: NavItem[] = [
    { label: "Finance Dashboard", href: "/dashboard", icon: TrendingUp },
    { label: "Staff Management", href: "/admin/staff", icon: UserCheck },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Plans", href: "/admin/plans", icon: CalendarDays },
    { label: "Taxes", href: "/admin/taxes", icon: Percent },
    { label: "Discounts", href: "/admin/discounts", icon: Tag },
    { label: "Quotation Templates", href: "/admin/templates", icon: FileCheck2 },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Subscriptions", href: "/subscriptions", icon: Layers },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Payments", href: "/payments", icon: CreditCard },
  ];

  // D. STAFF NAVIGATION
  const staffNav: NavItem[] = [
    { label: "Finance Dashboard", href: "/dashboard", icon: TrendingUp },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Quotations", href: "/subscriptions?status=QUOTATION", icon: FileEdit },
    { label: "Subscriptions", href: "/subscriptions", icon: Layers },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Payments", href: "/payments", icon: CreditCard },
  ];

  const navItems = role === "ADMIN" ? adminNav : staffNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#212529]/40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#dee2e6] p-4 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-4">
          <div className="px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c757d] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#343a40]" />
              Navigation
            </span>
          </div>

          <Suspense fallback={<div className="h-48" />}>
            <SidebarNavList navItems={navItems} onClose={onClose} />
          </Suspense>
        </div>
      </aside>
    </>
  );
}
