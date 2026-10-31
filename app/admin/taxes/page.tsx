"use client";

import React, { useState, useEffect } from "react";
import { TaxRule } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminTaxesPage() {
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);

  const [name, setName] = useState("");
  const [rate, setRate] = useState(18.0);
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const loadTaxes = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTaxes();
      setTaxes(res.data);
    } catch {
      toast.error("Failed to load tax rules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, []);

  const openCreateModal = () => {
    setEditingTax(null);
    setName("");
    setRate(18.0);
    setDescription("");
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const openEditModal = (tax: TaxRule) => {
    setEditingTax(tax);
    setName(tax.name);
    setRate(tax.rate);
    setDescription(tax.description);
    setIsDefault(tax.isDefault);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      if (editingTax) {
        await api.updateTax(editingTax.id, {
          name,
          rate: Number(rate),
          description,
          isDefault,
        });
        toast.success("Tax Rule Updated", { description: `${name} updated.` });
      } else {
        await api.createTax({
          name,
          rate: Number(rate),
          description,
          isDefault,
        });
        toast.success("Tax Rule Created", { description: `${name} registered.` });
      }
      setIsModalOpen(false);
      loadTaxes();
    } catch {
      toast.error("Failed to save tax rule");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Rules & Jurisdictions"
        description="Configure tax policies calculated automatically on net line amounts during recurring billing cycles."
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tax Rule
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {taxes.map((tax) => (
          <div
            key={tax.id}
            className="bg-white border border-[#dee2e6] rounded-2xl p-5 flex flex-col justify-between hover:border-[#ced4da] transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-[#212529] font-mono">{tax.rate.toFixed(2)}%</span>
                <div className="flex items-center gap-1.5">
                  {tax.isDefault && (
                    <span className="text-[10px] font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2 py-0.5 rounded-full">
                      Default Rule
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(tax)}
                    className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-[#212529] mt-1">{tax.name}</h3>
              <p className="text-xs text-[#6c757d] mt-2 leading-relaxed">{tax.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#dee2e6] flex items-center justify-between text-[11px] text-[#6c757d]">
              <span>Standard Rule</span>
              <span className="font-mono">{tax.rate}% applied automatically</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tax Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? "Edit Tax Rule" : "Create Tax Rule"}
        description="Provide the tax rate percentage and application scope."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Tax Name / Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goods and Services Tax (GST 18%)"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Tax Rate Percentage (%)</label>
            <input
              type="number"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              placeholder="18.0"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Applies to all software and recurring SaaS contract billings."
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefaultCheck"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-[#ced4da] text-[#343a40] focus:ring-0"
            />
            <label htmlFor="isDefaultCheck" className="text-xs text-[#495057] cursor-pointer">
              Set as system default tax rule for automated invoices
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
              {editingTax ? "Save Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
