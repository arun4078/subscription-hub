"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw, Lock, Mail, AlertCircle, ArrowRight, Laptop, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, deviceInfo, isRecognizedDevice, lastRecognizedUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success && res.role) {
        toast.success(`Welcome back! Logged in as ${res.role}`);
        if (res.role === "CUSTOMER") {
          router.push("/portal/subscriptions");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(res.error || "Login failed. Please verify credentials.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword("Admin@123!");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#212529]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#343a40] via-[#495057] to-[#212529] flex items-center justify-center mx-auto shadow-md shadow-[#343a40]/20">
          <RefreshCw className="w-6 h-6 text-[#f8f9fa]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#212529]">Brightloop</h2>
        <p className="mt-1 text-xs text-[#6c757d]">
          Unified Subscription & Recurring Billing Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-[#dee2e6] py-8 px-6 shadow-sm rounded-2xl sm:px-10 space-y-6">
          <div className="border-b border-[#dee2e6] pb-4">
            <h3 className="text-base font-semibold text-[#212529]">Sign In to Your Account</h3>
            <p className="text-xs text-[#6c757d] mt-0.5">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {isRecognizedDevice && deviceInfo && (
            <div className="p-3 bg-[#e8f0fe] border border-[#d2e3fc] rounded-xl flex items-center justify-between text-xs text-[#1a73e8]">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 shrink-0 text-[#1a73e8]" />
                <div>
                  <div className="font-semibold text-[#1a73e8] flex items-center gap-1.5">
                    <span>Recognized Device</span>
                    <span className="text-[10px] bg-[#ceead6] text-[#0d652d] font-semibold px-1.5 py-0.2 rounded">COOKIE VERIFIED</span>
                  </div>
                  <div className="text-[11px] text-[#495057] mt-0.5">
                    {deviceInfo.deviceName}
                    {lastRecognizedUser && (
                      <span> • Last user: <strong className="text-[#212529]">{lastRecognizedUser.name}</strong></span>
                    )}
                  </div>
                </div>
              </div>
              {lastRecognizedUser && (
                <button
                  type="button"
                  onClick={() => fillDemo(lastRecognizedUser.email, lastRecognizedUser.role)}
                  className="text-[11px] font-semibold text-[#1a73e8] hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  Autofill
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#fce8e6] border border-[#fad2cf] rounded-xl flex items-start gap-2.5 text-xs text-[#c5221f]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@brightloop.com"
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#495057]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#495057] hover:text-[#212529] underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
              <p className="text-[11px] text-[#6c757d] mt-1">
                Rule: &gt;8 characters with uppercase, lowercase &amp; special character.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins in Light Steel styling */}
          <div className="pt-4 border-t border-[#dee2e6] space-y-2">
            <span className="text-[11px] font-semibold text-[#6c757d] uppercase tracking-wider block">
              Quick Test Logins (Click to autofill):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@brightloop.com", "ADMIN")}
                className="text-[11px] bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] p-2 rounded-lg border border-[#ced4da] font-medium transition-colors"
              >
                Admin User
              </button>
              <button
                type="button"
                onClick={() => fillDemo("staff@brightloop.com", "STAFF")}
                className="text-[11px] bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] p-2 rounded-lg border border-[#ced4da] font-medium transition-colors"
              >
                Staff User
              </button>
              <button
                type="button"
                onClick={() => fillDemo("customer@apexlabs.com", "CUSTOMER")}
                className="text-[11px] bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] p-2 rounded-lg border border-[#ced4da] font-medium transition-colors"
              >
                Customer
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-[#6c757d]">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-xs font-semibold text-[#212529] hover:underline">
              Sign up as Customer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
