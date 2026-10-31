"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mockResetLink, setMockResetLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        const link = res.resetLink || `/reset-password?email=${encodeURIComponent(email)}`;
        setMockResetLink(link);
        setIsSubmitted(true);
        toast.success("Password Reset Initiated", {
          description: res.message || `Reset instructions processed for ${email}.`,
        });
      } else {
        toast.error(res.error || "Failed to process password reset request.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#212529]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#343a40] via-[#495057] to-[#212529] flex items-center justify-center mx-auto shadow-md shadow-[#343a40]/20">
          <RefreshCw className="w-6 h-6 text-[#f8f9fa]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#212529]">Reset Your Password</h2>
        <p className="mt-1 text-xs text-[#6c757d]">
          We&apos;ll generate a secure link to restore your account access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-[#dee2e6] py-8 px-6 shadow-sm rounded-2xl sm:px-10 space-y-6">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? "Processing..." : "Send Password Reset Link"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#212529]">Password Reset Link</h4>
                <p className="text-xs text-[#6c757d] mt-1">
                  A secure reset link has been generated for your registered account:
                </p>
              </div>

              <div className="p-3 bg-[#e9ecef] rounded-xl border border-[#ced4da] font-mono text-[11px] text-[#343a40] break-all text-left">
                {mockResetLink}
              </div>

              <Link
                href={mockResetLink}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold py-2 px-4 rounded-xl text-xs transition-all"
              >
                Open Reset Password Screen
              </Link>
            </div>
          )}

          <div className="text-center pt-2 border-t border-[#dee2e6]">
            <Link href="/login" className="text-xs text-[#6c757d] hover:text-[#212529] transition-colors">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
