"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw, Lock, Mail, Building2, User, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signup(name, email, password, company);
      if (res.success) {
        toast.success("Account Created Successfully", {
          description: "Welcome to Brightloop! Redirecting to your Customer Portal...",
        });
        router.push("/portal/subscriptions");
      } else {
        setError(res.error || "Failed to create account.");
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
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#212529]">Create Customer Account</h2>
        <p className="mt-1 text-xs text-[#6c757d]">
          Sign up to purchase and manage your subscriptions directly
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Company / Organization</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Tech Labs Inc."
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@apexlabs.com"
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="CustPass@2026!"
                  className="w-full bg-white border border-[#ced4da] rounded-xl pl-10 pr-3 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
              <p className="text-[11px] text-[#6c757d] mt-1">
                Must be &gt;8 chars, with uppercase, lowercase, and special character.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-[#6c757d]">Already registered? </span>
            <Link href="/login" className="text-xs font-semibold text-[#212529] hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
