"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role === "CUSTOMER" && !allowedRoles.includes("CUSTOMER")) {
        router.push("/portal/subscriptions");
      }
    }
  }, [isLoading, isAuthenticated, role, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#343a40] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#6c757d]">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Authoritative Role Check: If user does not have required role, reject access
  if (role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#fad2cf] rounded-2xl p-6 text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#212529]">403 - Access Denied</h2>
            <p className="text-xs text-[#6c757d] mt-1.5 leading-relaxed">
              Administrative credentials are required to access this resource. Your authenticated role ({role}) does not have permission to view or modify this configuration.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Finance Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
