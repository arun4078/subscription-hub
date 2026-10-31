"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { validatePassword, useAuth } from "@/lib/auth-context";
import { RefreshCw, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "demo_token";
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const check = validatePassword(newPassword);
    if (!check.valid) {
      setError(check.reason || "Invalid password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(token, newPassword);
      if (res.success) {
        setIsDone(true);
        toast.success("Password Updated Successfully", {
          description: res.message || "You can now log in with your new credentials.",
        });
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch {
      setError("An unexpected error occurred.");
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
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#212529]">Create New Password</h2>
        <p className="mt-1 text-xs text-[#6c757d]">
          Enter a compliant password for your Brightloop account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-[#dee2e6] py-8 px-6 shadow-sm rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-[#fce8e6] border border-[#fad2cf] rounded-xl flex items-start gap-2.5 text-xs text-[#c5221f]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isDone ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#6c757d] mt-1">
                  Must be &gt;8 chars with uppercase, lowercase, and special character.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? "Saving..." : "Save New Password"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#212529]">Password Reset Complete</h4>
              <p className="text-xs text-[#6c757d]">
                Redirecting you to the login screen...
              </p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-xs text-[#6c757d]">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
