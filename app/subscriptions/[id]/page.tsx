"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Subscription,
  SubscriptionStatus,
  Customer,
  Plan,
  Product,
  QuotationTemplate,
  SubscriptionLine,
  BillingPeriod,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  Building2,
  FileCheck2,
  Plus,
  Trash2,
  Save,
  Pause,
  Play,
  RotateCw,
  XCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function SubscriptionDetailInner({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");

  const resolvedParams = React.use(params);
  const isNew = resolvedParams.id === "new";

  const [sub, setSub] = useState<Subscription | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for new subscription
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateIdParam || "");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [formStatus, setFormStatus] = useState<SubscriptionStatus>("DRAFT");
  const [lines, setLines] = useState<SubscriptionLine[]>([]);

  // Dialog states
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [custRes, plansRes, prodsRes, tmplRes] = await Promise.all([
          api.getCustomers(),
          api.getPlans(),
          api.getProducts(),
          api.getTemplates(),
        ]);
        setCustomers(custRes.data);
        setPlans(plansRes.data);
        setProducts(prodsRes.data);
        setTemplates(tmplRes.data);

        if (isNew) {
          if (custRes.data.length > 0) setSelectedCustomerId(custRes.data[0].id);

          // If a template was specified in URL, apply it
          if (templateIdParam) {
            const tmpl = tmplRes.data.find((t) => t.id === templateIdParam);
            if (tmpl) {
              setSelectedTemplateId(tmpl.id);
              const p = plansRes.data.find((plan) => plan.id === tmpl.planId);
              if (p) {
                setSelectedPlanId(p.id);
                setBillingPeriod(p.billingPeriod);
              }
              const newLines = tmpl.lines.map((tl, i) => {
                const prod = prodsRes.data.find((pr) => pr.id === tl.productId);
                const variant = prod?.variants.find((v) => v.id === tl.variantId);
                const unitPrice = tl.unitPrice || prod?.salesPrice || 1200;
                const extra = variant?.extraPrice || 0;
                return {
                  id: `line-${Date.now()}-${i}`,
                  productId: tl.productId,
                  productName: prod?.name || "Product License",
                  variantId: variant?.id,
                  variantName: variant?.name,
                  variantExtra: extra,
                  quantity: tl.quantity,
                  unitPrice,
                  taxRate: 18.0,
                  lineSubtotal: (unitPrice + extra) * tl.quantity,
                };
              });
              setLines(newLines);

              // Calculate expiry date from template validityDays
              const exp = new Date();
              exp.setDate(exp.getDate() + tmpl.validityDays);
              setExpiryDate(exp.toISOString().split("T")[0]);
              return;
            }
          }

          if (plansRes.data.length > 0) {
            setSelectedPlanId(plansRes.data[0].id);
            setBillingPeriod(plansRes.data[0].billingPeriod);
          }
          if (prodsRes.data.length > 0) {
            const p = prodsRes.data[0];
            setLines([
              {
                id: `line-${Date.now()}`,
                productId: p.id,
                productName: p.name,
                variantExtra: 0,
                quantity: 1,
                unitPrice: p.salesPrice,
                taxRate: 18.0,
                lineSubtotal: p.salesPrice,
              },
            ]);
          }
        } else {
          const subRes = await api.getSubscriptionById(resolvedParams.id);
          setSub(subRes.data);
        }
      } catch {
        toast.error("Failed to load subscription data");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [resolvedParams.id, isNew, templateIdParam]);

  const handleApplyTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (!tmpl) return;

    const plan = plans.find((p) => p.id === tmpl.planId);
    if (plan) {
      setSelectedPlanId(plan.id);
      setBillingPeriod(plan.billingPeriod);
    }

    const exp = new Date();
    exp.setDate(exp.getDate() + tmpl.validityDays);
    setExpiryDate(exp.toISOString().split("T")[0]);

    const newLines = tmpl.lines.map((tl, i) => {
      const prod = products.find((pr) => pr.id === tl.productId);
      const variant = prod?.variants.find((v) => v.id === tl.variantId);
      const unitPrice = tl.unitPrice || prod?.salesPrice || 1200;
      const extra = variant?.extraPrice || 0;
      return {
        id: `line-${Date.now()}-${i}`,
        productId: tl.productId,
        productName: prod?.name || "Product License",
        variantId: variant?.id,
        variantName: variant?.name,
        variantExtra: extra,
        quantity: tl.quantity,
        unitPrice,
        taxRate: 18.0,
        lineSubtotal: (unitPrice + extra) * tl.quantity,
      };
    });

    setLines(newLines);
    toast.info("Quotation Template Loaded", {
      description: `Loaded ${tmpl.name} (Valid for ${tmpl.validityDays} days).`,
    });
  };

  const handleAddLine = () => {
    if (products.length === 0) return;
    const p = products[0];
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        variantExtra: 0,
        quantity: 1,
        unitPrice: p.salesPrice,
        taxRate: 18.0,
        lineSubtotal: p.salesPrice,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof SubscriptionLine, val: unknown) => {
    setLines((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };
      if (field === "productId") {
        const prod = products.find((p) => p.id === val);
        item.productName = prod?.name || "";
        item.unitPrice = prod?.salesPrice || 0;
        item.variantExtra = 0;
        item.variantId = undefined;
        item.variantName = undefined;
      }
      if (field === "variantId") {
        const prod = products.find((p) => p.id === item.productId);
        const variant = prod?.variants.find((v) => v.id === val);
        item.variantName = variant?.name;
        item.variantExtra = variant?.extraPrice || 0;
      }
      item.lineSubtotal = (item.unitPrice + (item.variantExtra || 0)) * item.quantity;
      updated[index] = item;
      return updated;
    });
  };

  const subtotal = lines.reduce((sum, l) => sum + l.lineSubtotal, 0);
  const discountTotal = lines.length >= 5 || subtotal >= 5000 ? subtotal * 0.1 : 0;
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxableBase * 0.18 * 100) / 100;
  const totalAmount = Math.round((taxableBase + taxTotal) * 100) / 100;

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId || lines.length === 0) {
      toast.error("Please specify customer, plan, and at least one line item.");
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const plan = plans.find((p) => p.id === selectedPlanId);

    try {
      const created = await api.createSubscription({
        customerId: customer?.id || "",
        customerName: customer?.name || "",
        customerEmail: customer?.email || "",
        customerCompany: customer?.companyName || "",
        planId: plan?.id || "",
        planName: plan?.name || "",
        billingPeriod,
        startDate,
        expiryDate: expiryDate || undefined,
        nextBillingDate,
        paymentTerms,
        status: formStatus,
        lines,
        subtotal,
        discountTotal,
        taxTotal,
        totalAmount,
        autoClose: plan?.autoClose || false,
        pausable: plan?.pausable ?? true,
      });

      toast.success("Subscription Created", {
        description: `Contract ${created.data.subscriptionNumber} saved as ${formStatus}.`,
      });
      router.push(`/subscriptions/${created.data.id}`);
    } catch {
      toast.error("Failed to create subscription");
    }
  };

  const handleTransition = async (nextStatus: SubscriptionStatus) => {
    if (!sub) return;
    try {
      const updated = await api.transitionSubscriptionStatus(sub.id, nextStatus);
      setSub(updated.data);
      toast.success("Subscription Status Shifted", {
        description: `Contract ${sub.subscriptionNumber} is now ${nextStatus}.`,
      });
    } catch {
      toast.error("Status transition failed");
    }
  };

  const handleRenew = async () => {
    if (!sub) return;
    try {
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingPeriod === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
      else if (sub.billingPeriod === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
      else if (sub.billingPeriod === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.billingPeriod === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

      const updated = await api.updateSubscription(sub.id, {
        nextBillingDate: nextDate.toISOString().split("T")[0],
        status: "ACTIVE",
      });
      setSub(updated.data);
      toast.success("Subscription Renewed", {
        description: `Next billing date advanced to ${nextDate.toISOString().split("T")[0]}.`,
      });
    } catch {
      toast.error("Failed to renew subscription");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  const lifecycleStages: SubscriptionStatus[] = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"];
  const currentStageIndex = sub ? lifecycleStages.indexOf(sub.status) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/subscriptions"
            className="p-2 rounded-xl bg-white border border-[#dee2e6] text-[#6c757d] hover:text-[#212529] hover:bg-[#e9ecef] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <PageHeader
            title={isNew ? "Create New Subscription Contract" : `Subscription: ${sub?.subscriptionNumber}`}
            description={
              isNew
                ? "Generate a proposal or contract from quotation templates with product and variant lines."
                : `Customer: ${sub?.customerName} (${sub?.customerCompany})`
            }
            actions={
              !isNew &&
              sub && (
                <div className="flex items-center gap-2 flex-wrap">
                  {sub.status === "DRAFT" && (
                    <button
                      onClick={() => handleTransition("QUOTATION")}
                      className="bg-[#fef7e0] hover:bg-[#feefc3] text-[#b06000] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#feefc3] transition-all cursor-pointer"
                    >
                      Send Quotation
                    </button>
                  )}
                  {sub.status === "QUOTATION" && (
                    <button
                      onClick={() => handleTransition("CONFIRMED")}
                      className="bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#d2e3fc] transition-all cursor-pointer"
                    >
                      Confirm Contract
                    </button>
                  )}
                  {sub.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleTransition("ACTIVE")}
                      className="bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#ceead6] transition-all cursor-pointer"
                    >
                      Activate Subscription
                    </button>
                  )}
                  {sub.status === "ACTIVE" && (
                    <>
                      {sub.pausable && (
                        <button
                          onClick={() => handleTransition("CLOSED")}
                          className="bg-[#e9ecef] hover:bg-[#dee2e6] text-[#343a40] text-xs font-medium px-3 py-2 rounded-xl border border-[#ced4da] transition-all cursor-pointer flex items-center gap-1.5"
                          title="Pause contract"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={handleRenew}
                        className="bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] text-xs font-semibold px-3 py-2 rounded-xl border border-[#ceead6] transition-all cursor-pointer flex items-center gap-1.5"
                        title="Renew for next billing cycle"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Renew Cycle
                      </button>
                      <button
                        onClick={() => setIsCloseConfirmOpen(true)}
                        className="bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] text-xs font-semibold px-3 py-2 rounded-xl border border-[#fad2cf] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </>
                  )}
                </div>
              )
            }
          />
        </div>

        {/* Visual Lifecycle Stepper Pipeline for Existing Subscriptions */}
        {!isNew && sub && (
          <div className="bg-white border border-[#dee2e6] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6c757d] mb-3">
              <span>Contract Lifecycle Pipeline:</span>
              <span className="font-mono text-[#212529]">Current State: {sub.status}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 relative">
              {lifecycleStages.map((stage, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div
                    key={stage}
                    className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-[#343a40] text-[#f8f9fa] border-[#212529] shadow-xs font-bold"
                        : isPassed
                        ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6] font-medium"
                        : "bg-[#f8f9fa] text-[#adb5bd] border-[#dee2e6]"
                    }`}
                  >
                    <div className="text-[11px] font-mono mb-1">{idx + 1}. {stage}</div>
                    <span className="text-[10px]">
                      {isCurrent ? "Active Stage" : isPassed ? "Completed" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isNew ? (
          /* CREATE SUBSCRIPTION FORM */
          <form onSubmit={handleCreateSubscription} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer selection */}
              <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-[#212529] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#6c757d]" />
                  Target Customer
                </span>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className={inputCls}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={inputCls}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>

              {/* Plan & Template */}
              <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-[#212529] flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#6c757d]" />
                  Template or Plan Source
                </span>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Quotation Template (Optional)</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Start from scratch --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Valid {t.validityDays}d)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Primary Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
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

              {/* Cadence & Dates */}
              <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-[#212529] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6c757d]" />
                  Billing Cadence & Schedule
                </span>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Billing Frequency</label>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#6c757d] mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#6c757d] mb-1">Next Billing</label>
                    <input
                      type="date"
                      value={nextBillingDate}
                      onChange={(e) => setNextBillingDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#6c757d] mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Line items editor */}
            <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#212529]">Subscription Line Items</h3>
                  <p className="text-xs text-[#6c757d]">
                    Rule: Line amount = Quantity × (Unit Price + Variant Extra).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] text-xs px-3 py-1.5 rounded-xl border border-[#ced4da] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const product = products.find((p) => p.id === line.productId);
                  return (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] items-end"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-[#6c757d] mb-1">Product</label>
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineChange(idx, "productId", e.target.value)}
                          className={inputCls}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-[#6c757d] mb-1">Variant & Surcharge</label>
                        <select
                          value={line.variantId || ""}
                          onChange={(e) => handleLineChange(idx, "variantId", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">None ($0)</option>
                          {product?.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} (+${v.extraPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-[#6c757d] mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-[#6c757d] mb-1">Line Total</label>
                        <div className="p-2 text-xs font-bold text-[#212529] font-mono bg-white rounded-xl border border-[#dee2e6]">
                          ${line.lineSubtotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-[#6c757d] hover:text-[#c5221f] p-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="mt-4 pt-4 border-t border-[#dee2e6] flex justify-end">
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-[#6c757d]">
                    <span>Subtotal:</span>
                    <span className="font-mono text-[#212529]">${subtotal.toFixed(2)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-[#137333]">
                      <span>Volume Discount (10%):</span>
                      <span className="font-mono">-${discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6c757d]">
                    <span>GST Tax (18%):</span>
                    <span className="font-mono text-[#212529]">+${taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#dee2e6] text-[#212529]">
                    <span>Recurring Total:</span>
                    <span className="font-mono text-[#137333]">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#6c757d]">Initial Status:</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SubscriptionStatus)}
                  className="bg-white border border-[#ced4da] text-xs text-[#212529] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#343a40]"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="QUOTATION">QUOTATION</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/subscriptions"
                  className="px-4 py-2 text-xs font-semibold text-[#6c757d] hover:text-[#212529] transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Subscription Contract
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* SUBSCRIPTION DETAIL VIEW */
          sub && (
            <div className="space-y-6">
              {/* Header Details Banner */}
              <div className="bg-white border border-[#dee2e6] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-6 shadow-xs">
                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block">Customer</span>
                  <div className="text-base font-bold text-[#212529] mt-1">{sub.customerName}</div>
                  <div className="text-xs text-[#6c757d]">{sub.customerCompany}</div>
                </div>

                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block">Plan & Cadence</span>
                  <div className="text-sm font-semibold text-[#212529] mt-1">{sub.planName}</div>
                  <div className="text-xs text-[#343a40] font-mono mt-0.5">
                    {sub.billingPeriod} • {sub.paymentTerms}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block">Next Billing Run</span>
                  <div className="text-sm font-semibold text-[#212529] font-mono mt-1">{sub.nextBillingDate}</div>
                  <div className="text-xs text-[#6c757d]">Started: {sub.startDate}</div>
                </div>

                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider block">Contract Value</span>
                  <div className="text-xl font-bold text-[#137333] font-mono mt-1">${sub.totalAmount.toFixed(2)}</div>
                  <div className="mt-1">
                    <StatusBadge status={sub.status} />
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className="bg-white border border-[#dee2e6] rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#212529]">Configured Contract Lines</h3>
                  <Link
                    href={`/invoices`}
                    className="text-xs font-semibold text-[#343a40] hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Invoices</span>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f1f3f5] text-[#495057] uppercase tracking-wider text-[11px] border-b border-[#dee2e6]">
                      <tr>
                        <th className="py-2.5 px-3">Product / Service</th>
                        <th className="py-2.5 px-3">Variant</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3">Quantity</th>
                        <th className="py-2.5 px-3">Tax Rate</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6] text-[#495057]">
                      {sub.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="py-3 px-3 font-semibold text-[#212529]">{l.productName}</td>
                          <td className="py-3 px-3 text-[#495057]">
                            {l.variantName ? `${l.variantName} (+$${l.variantExtra})` : "Standard ($0)"}
                          </td>
                          <td className="py-3 px-3 font-mono">${l.unitPrice.toFixed(2)}</td>
                          <td className="py-3 px-3">{l.quantity} seat(s)</td>
                          <td className="py-3 px-3 text-[#6c757d]">{l.taxRate}%</td>
                          <td className="py-3 px-3 font-mono font-bold text-right text-[#212529]">
                            ${l.lineSubtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#dee2e6]">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-[#6c757d]">
                      <span>Subtotal:</span>
                      <span className="font-mono text-[#212529]">${sub.subtotal.toFixed(2)}</span>
                    </div>
                    {sub.discountTotal > 0 && (
                      <div className="flex justify-between text-[#137333]">
                        <span>Discount:</span>
                        <span className="font-mono">-${sub.discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#6c757d]">
                      <span>Tax (18%):</span>
                      <span className="font-mono text-[#212529]">+${sub.taxTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#dee2e6] text-[#212529]">
                      <span>Total Value:</span>
                      <span className="font-mono text-[#137333]">${sub.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        <ConfirmDialog
          isOpen={isCloseConfirmOpen}
          onClose={() => setIsCloseConfirmOpen(false)}
          onConfirm={() => {
            setIsCloseConfirmOpen(false);
            handleTransition("CLOSED");
          }}
          title="Close Subscription Contract"
          message={`Are you sure you want to terminate subscription ${sub?.subscriptionNumber}? Future recurring billings will be halted.`}
          confirmLabel="Close Contract"
          confirmVariant="danger"
        />
      </div>
    </DashboardLayout>
  );
}

export default function SubscriptionDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#6c757d]">Loading contract...</div>}>
      <SubscriptionDetailInner {...props} />
    </Suspense>
  );
}
