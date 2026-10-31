"use client";

import React, { useState, useEffect } from "react";
import { DiscountRule, DiscountType, Product } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);

  // Form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState(10);
  const [minQuantity, setMinQuantity] = useState<number | undefined>(5);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number | undefined>(5000);
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [usageLimit, setUsageLimit] = useState<number | undefined>(50);
  const [productId, setProductId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [discRes, prodsRes] = await Promise.all([api.getDiscounts(), api.getProducts()]);
      setDiscounts(discRes.data);
      setProducts(prodsRes.data);
    } catch {
      toast.error("Failed to load discount rules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingDiscount(null);
    setCode("");
    setName("");
    setDiscountType("PERCENTAGE");
    setValue(10);
    setMinQuantity(5);
    setMinPurchaseAmount(5000);
    setStartDate("2026-01-01");
    setEndDate("2026-12-31");
    setUsageLimit(50);
    setProductId("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (d: DiscountRule) => {
    setEditingDiscount(d);
    setCode(d.code);
    setName(d.name);
    setDiscountType(d.discountType);
    setValue(d.value);
    setMinQuantity(d.minQuantity);
    setMinPurchaseAmount(d.minPurchaseAmount);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setUsageLimit(d.usageLimit);
    setProductId(d.productId || "");
    setIsActive(d.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    try {
      if (editingDiscount) {
        await api.updateDiscount(editingDiscount.id, {
          code: code.toUpperCase(),
          name,
          discountType,
          value: Number(value),
          minQuantity: minQuantity ? Number(minQuantity) : undefined,
          minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
          startDate,
          endDate,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          productId: productId || undefined,
          isActive,
        });
        toast.success("Discount Rule Updated", { description: `${code} updated.` });
      } else {
        await api.createDiscount({
          code: code.toUpperCase(),
          name,
          discountType,
          value: Number(value),
          minQuantity: minQuantity ? Number(minQuantity) : undefined,
          minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
          startDate,
          endDate,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          productId: productId || undefined,
          isActive,
        });
        toast.success("Discount Rule Created", { description: `${code} rule active.` });
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save discount rule");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts & Promotions"
        description="Configure promotional rules that automatically apply to eligible invoices and contracts."
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Discount Rule
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {discounts.map((disc) => (
          <div
            key={disc.id}
            className="bg-white border border-[#dee2e6] rounded-2xl p-5 flex flex-col justify-between hover:border-[#ced4da] transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#137333] bg-[#e6f4ea] px-2.5 py-1 rounded-lg border border-[#ceead6]">
                  {disc.code}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      disc.isActive
                        ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6]"
                        : "bg-[#e9ecef] text-[#6c757d] border-[#ced4da]"
                    }`}
                  >
                    {disc.isActive ? "Active" : "Disabled"}
                  </span>
                  <button
                    onClick={() => openEditModal(disc)}
                    className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-[#212529] mt-1">{disc.name}</h3>

              <div className="mt-3 bg-[#f8f9fa] p-3 rounded-xl border border-[#dee2e6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider">Discount Rate</span>
                  <div className="text-xl font-bold text-[#212529]">
                    {disc.discountType === "PERCENTAGE" ? `${disc.value}% OFF` : `-$${disc.value.toFixed(2)} FIXED`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider">Usage Progress</span>
                  <div className="text-sm font-semibold text-[#495057]">
                    {disc.usageCount} / {disc.usageLimit || "∞"} redeemed
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-[#6c757d]">
                {disc.minQuantity && (
                  <div className="flex justify-between">
                    <span>Minimum Quantity:</span>
                    <span className="font-semibold text-[#212529]">{disc.minQuantity} seats</span>
                  </div>
                )}
                {disc.minPurchaseAmount && (
                  <div className="flex justify-between">
                    <span>Minimum Purchase:</span>
                    <span className="font-semibold text-[#212529]">${disc.minPurchaseAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Scope:</span>
                  <span className="font-semibold text-[#343a40]">
                    {disc.productId
                      ? products.find((p) => p.id === disc.productId)?.name || "Specific Product"
                      : "Whole Subscription"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#dee2e6] text-[10px] text-[#6c757d] flex justify-between">
              <span>Valid: {disc.startDate} to {disc.endDate}</span>
              <span>Auto-applied before tax</span>
            </div>
          </div>
        ))}
      </div>

      {/* Discount Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? "Edit Discount Policy" : "Create Discount Policy"}
        description="Define discount thresholds, duration window, and seat thresholds."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Promo / Coupon Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ENTERPRISE10"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Policy Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enterprise Volume Discount"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className={inputCls}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">
                Value ({discountType === "PERCENTAGE" ? "%" : "$"})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Min Quantity (Seats)</label>
              <input
                type="number"
                min="0"
                value={minQuantity ?? ""}
                onChange={(e) => setMinQuantity(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Optional e.g. 5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Min Purchase Amount ($)</label>
              <input
                type="number"
                min="0"
                value={minPurchaseAmount ?? ""}
                onChange={(e) => setMinPurchaseAmount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Optional e.g. 5000"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={usageLimit ?? ""}
                onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 50 (Blank: ∞)"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Eligible Scope</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={inputCls}
            >
              <option value="">Whole Subscription Contract</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  Specific Product: {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
            />
            <label htmlFor="isActiveCheck" className="text-xs text-[#495057] cursor-pointer">
              Policy is actively available for subscription calculations
            </label>
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
              {editingDiscount ? "Save Policy" : "Create Policy"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
