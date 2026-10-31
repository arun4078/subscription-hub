"use client";

import React, { useState, useEffect } from "react";
import { Plan, Product, BillingPeriod } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState(1200);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [minimumQuantity, setMinimumQuantity] = useState(1);
  const [availableFrom, setAvailableFrom] = useState("2026-01-01");
  const [availableUntil, setAvailableUntil] = useState("");
  const [autoClose, setAutoClose] = useState(false);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, prodsRes] = await Promise.all([api.getPlans(), api.getProducts()]);
      setPlans(plansRes.data);
      setProducts(prodsRes.data);
      if (prodsRes.data.length > 0 && !productId) {
        setProductId(prodsRes.data[0].id);
      }
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName("");
    setPrice(1200);
    setBillingPeriod("MONTHLY");
    setMinimumQuantity(1);
    setAvailableFrom("2026-01-01");
    setAvailableUntil("");
    setAutoClose(false);
    setClosable(true);
    setPausable(true);
    setRenewable(true);
    if (products.length > 0) setProductId(products[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setProductId(p.productId);
    setPrice(p.price);
    setBillingPeriod(p.billingPeriod);
    setMinimumQuantity(p.minimumQuantity);
    setAvailableFrom(p.availableFrom);
    setAvailableUntil(p.availableUntil || "");
    setAutoClose(p.autoClose);
    setClosable(p.closable);
    setPausable(p.pausable);
    setRenewable(p.renewable);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !productId) return;

    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, {
          name,
          productId,
          price: Number(price),
          billingPeriod,
          minimumQuantity: Number(minimumQuantity),
          availableFrom,
          availableUntil: availableUntil || undefined,
          autoClose,
          closable,
          pausable,
          renewable,
        });
        toast.success("Plan Updated", { description: `${name} has been updated.` });
      } else {
        await api.createPlan({
          name,
          productId,
          price: Number(price),
          billingPeriod,
          minimumQuantity: Number(minimumQuantity),
          availableFrom,
          availableUntil: availableUntil || undefined,
          autoClose,
          closable,
          pausable,
          renewable,
        });
        toast.success("Plan Created", { description: `${name} is now available.` });
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save plan");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans & Cadences"
        description="Configure pricing, billing intervals (Daily, Weekly, Monthly, Yearly), minimum seat limits, and lifecycle flags (auto-close, pausable, renewable)."
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Plan
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const product = products.find((pr) => pr.id === p.productId);

          return (
            <div
              key={p.id}
              className="bg-white border border-[#dee2e6] rounded-2xl p-5 flex flex-col justify-between hover:border-[#ced4da] transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc] font-mono">
                    {p.billingPeriod}
                  </span>
                  <button
                    onClick={() => openEditModal(p)}
                    className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg transition-colors cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#212529]">{p.name}</h3>
                <div className="text-xs text-[#6c757d] mt-0.5 flex items-center gap-1.5">
                  <span>Product:</span>
                  <span className="text-[#343a40] font-medium">{product?.name || "Direct License"}</span>
                </div>

                <div className="mt-4 flex items-baseline gap-1 bg-[#f8f9fa] p-3 rounded-xl border border-[#dee2e6]">
                  <span className="text-2xl font-bold text-[#212529]">${p.price.toFixed(2)}</span>
                  <span className="text-xs text-[#6c757d]">/ {p.billingPeriod.toLowerCase()}</span>
                  <span className="text-[11px] text-[#6c757d] ml-auto">Min Qty: {p.minimumQuantity}</span>
                </div>

                {/* Lifecycle Options Matrix */}
                <div className="mt-4 pt-3 border-t border-[#dee2e6] space-y-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-[#6c757d] block">Lifecycle Rules:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {p.autoClose ? (
                        <Check className="w-3.5 h-3.5 text-[#137333]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#adb5bd]" />
                      )}
                      <span className={p.autoClose ? "text-[#212529] font-medium" : "text-[#adb5bd]"}>Auto-Close</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.pausable ? (
                        <Check className="w-3.5 h-3.5 text-[#137333]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#adb5bd]" />
                      )}
                      <span className={p.pausable ? "text-[#212529] font-medium" : "text-[#adb5bd]"}>Pausable</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.closable ? (
                        <Check className="w-3.5 h-3.5 text-[#137333]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#adb5bd]" />
                      )}
                      <span className={p.closable ? "text-[#212529] font-medium" : "text-[#adb5bd]"}>Closable Early</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.renewable ? (
                        <Check className="w-3.5 h-3.5 text-[#137333]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#adb5bd]" />
                      )}
                      <span className={p.renewable ? "text-[#212529] font-medium" : "text-[#adb5bd]"}>Renewable</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#dee2e6] text-[10px] text-[#6c757d] flex justify-between">
                <span>Available From: {p.availableFrom}</span>
                <span>{p.availableUntil ? `Until: ${p.availableUntil}` : "No Expiration"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
        description="Set billing cadence, minimum seat requirements, and automated lifecycle closures."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ERP Cloud Monthly"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Associated Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={inputCls}
              >
                {products.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Plan Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Billing Period</label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                className={inputCls}
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="YEARLY">YEARLY</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Available From</label>
              <input
                type="date"
                required
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Available Until (Optional)</label>
              <input
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Lifecycle Toggles */}
          <div className="p-3.5 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] space-y-2">
            <span className="text-xs font-semibold text-[#212529]">Lifecycle Control Options</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
                />
                <span className="text-[#495057]">Auto-Close on End</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={closable}
                  onChange={(e) => setClosable(e.target.checked)}
                  className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
                />
                <span className="text-[#495057]">Allow Early Close</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pausable}
                  onChange={(e) => setPausable(e.target.checked)}
                  className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
                />
                <span className="text-[#495057]">Allow Pause</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renewable}
                  onChange={(e) => setRenewable(e.target.checked)}
                  className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
                />
                <span className="text-[#495057]">Allow Renewal</span>
              </label>
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
              {editingPlan ? "Save Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
