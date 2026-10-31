"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Customer } from "@/lib/types";
import { api } from "@/lib/api";
import { Users, Plus, Search, Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCustomers();
      setCustomers(res.data);
    } catch {
      toast.error("Failed to load customer directory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !companyName) return;

    try {
      await api.createCustomer({ name, email, companyName, phone, address });
      toast.success("Customer Record Created", {
        description: `${companyName} (${name}) registered successfully.`,
      });
      setIsModalOpen(false);
      setName(""); setEmail(""); setCompanyName(""); setPhone(""); setAddress("");
      loadCustomers();
    } catch {
      toast.error("Failed to create customer");
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Customer Accounts"
          description="Enterprise customer registry for managing accounts, contacts, and contract relationships."
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Customer
            </button>
          }
        />

        {/* Search Bar */}
        <div className="bg-white border border-[#dee2e6] p-4 rounded-2xl shadow-xs">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              placeholder="Search by contact name, company, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#ced4da] rounded-xl pl-10 pr-4 py-2 text-xs text-[#212529] placeholder-[#adb5bd] focus:outline-none focus:border-[#343a40] transition-all"
            />
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Company / Organization</th>
                  <th className="py-3 px-4 font-semibold">Primary Contact</th>
                  <th className="py-3 px-4 font-semibold">Contact Email</th>
                  <th className="py-3 px-4 font-semibold">Phone / Location</th>
                  <th className="py-3 px-4 font-semibold">Registration Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6c757d]">Loading customers...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6c757d]">No customers found.</td>
                  </tr>
                ) : filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#212529] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#6c757d]" />
                        {cust.companyName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#212529]">{cust.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6c757d]">{cust.email}</td>
                    <td className="py-3.5 px-4 text-[#6c757d] text-[11px]">
                      {cust.phone || "No phone"} • {cust.address || "Location unassigned"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6c757d]">
                      {cust.createdAt.split("T")[0]}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/subscriptions/new?customerId=${cust.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#343a40] hover:text-[#212529] bg-[#e9ecef] hover:bg-[#dee2e6] px-2.5 py-1 rounded-lg border border-[#ced4da] transition-colors"
                      >
                        Create Quote
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Customer Profile"
          description="Register a new customer account to issue quotations and subscriptions."
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Company / Organization Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Software Corp"
                className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@acme.com"
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2831"
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">Billing Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Austin, TX"
                  className="w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Create Customer
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
