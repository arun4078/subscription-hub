"use client";

import React, { useState, useEffect } from "react";
import { QuotationTemplate, Plan, Product } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [planId, setPlanId] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tmplRes, plansRes, prodsRes] = await Promise.all([
        api.getTemplates(),
        api.getPlans(),
        api.getProducts(),
      ]);
      setTemplates(tmplRes.data);
      setPlans(plansRes.data);
      setProducts(prodsRes.data);
      if (plansRes.data.length > 0 && !planId) {
        setPlanId(plansRes.data[0].id);
      }
    } catch {
      toast.error("Failed to load quotation templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setValidityDays(30);
    if (plans.length > 0) setPlanId(plans[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (t: QuotationTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setDescription(t.description);
    setValidityDays(t.validityDays);
    setPlanId(t.planId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !planId) return;

    try {
      const selectedPlan = plans.find((p) => p.id === planId);
      const lines = [
        {
          id: `tl-${Date.now()}`,
          productId: selectedPlan?.productId || products[0]?.id || "prod-1",
          planId,
          quantity: 5,
          unitPrice: selectedPlan?.price || 1200,
        },
      ];

      if (editingTemplate) {
        await api.updateTemplate(editingTemplate.id, {
          name,
          description,
          validityDays: Number(validityDays),
          planId,
          lines,
        });
        toast.success("Template Updated", { description: `${name} saved.` });
      } else {
        await api.createTemplate({
          name,
          description,
          validityDays: Number(validityDays),
          planId,
          lines,
        });
        toast.success("Template Created", { description: `${name} ready for sales team.` });
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save template");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Templates"
        description="Standardized proposals pre-populated with plans, variant lines, and validity windows to accelerate quotation creation."
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Template
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tmpl) => {
          const plan = plans.find((p) => p.id === tmpl.planId);

          return (
            <div
              key={tmpl.id}
              className="bg-white border border-[#dee2e6] rounded-2xl p-5 flex flex-col justify-between hover:border-[#ced4da] transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs text-[#1a73e8] font-semibold bg-[#e8f0fe] px-2.5 py-1 rounded-lg border border-[#d2e3fc]">
                    <Clock className="w-3.5 h-3.5" />
                    Valid for {tmpl.validityDays} Days
                  </span>
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg"
                    title="Edit Template"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#212529] mt-1">{tmpl.name}</h3>
                <p className="text-xs text-[#6c757d] mt-1.5 leading-relaxed">{tmpl.description}</p>

                <div className="mt-4 p-3 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6c757d]">Pre-configured Plan:</span>
                    <span className="font-semibold text-[#212529]">{plan?.name || "Standard Plan"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6c757d]">Billing Cadence:</span>
                    <span className="font-mono font-semibold text-[#343a40]">{plan?.billingPeriod || "MONTHLY"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6c757d]">Preset Line Items:</span>
                    <span className="text-[#212529]">{tmpl.lines.length} configured</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#dee2e6] flex items-center justify-end">
                <Link
                  href={`/subscriptions/new?templateId=${tmpl.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#343a40] hover:text-[#212529] hover:underline"
                >
                  Create Subscription From Template
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Edit Quotation Template" : "New Quotation Template"}
        description="Set up default pricing lines and expiry terms."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Template Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enterprise ERP + Odoo Package"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of deliverables, services, and inclusions..."
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                placeholder="30"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Default Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className={inputCls}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price}/{p.billingPeriod})
                  </option>
                ))}
              </select>
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
              {editingTemplate ? "Save Template" : "Create Template"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
