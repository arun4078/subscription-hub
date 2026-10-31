"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Product, Plan, ProductVariant, DiscountRule, PaymentMethod } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Package,
  Check,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function CustomerPortalPlansStorePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected for checkout
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("842");

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    subscriptionNumber: string;
    invoiceNumber: string;
    subscriptionId: string;
    invoiceId: string;
    totalPaid: number;
    planName: string;
    productName: string;
    variantName?: string;
  } | null>(null);

  useEffect(() => {
    async function loadStore() {
      setIsLoading(true);
      try {
        const [prodsRes, plansRes, discRes] = await Promise.all([
          api.getProducts(),
          api.getPlans(),
          api.getDiscounts(),
        ]);
        setProducts(prodsRes.data);
        setPlans(plansRes.data);
        setDiscounts(discRes.data);
      } catch {
        toast.error("Failed to load store catalog");
      } finally {
        setIsLoading(false);
      }
    }
    loadStore();
  }, []);

  const openCheckout = (prod: Product, plan: Plan) => {
    setSelectedProduct(prod);
    setSelectedPlan(plan);
    setSelectedVariant(prod.variants.length > 0 ? prod.variants[0] : null);
    setQuantity(Math.max(1, plan.minimumQuantity || 1));
    setPromoCodeInput("");
    setAppliedDiscount(null);
    setIsCheckoutOpen(true);
  };

  // Pricing calculations
  const unitPrice = selectedProduct?.salesPrice || selectedPlan?.price || 0;
  const variantExtra = selectedVariant?.extraPrice || 0;
  const lineRate = unitPrice + variantExtra;
  const subtotal = lineRate * quantity;

  // Apply promo discount
  let discountDeduction = 0;
  if (appliedDiscount) {
    if (appliedDiscount.discountType === "PERCENTAGE") {
      discountDeduction = (subtotal * appliedDiscount.value) / 100;
    } else {
      discountDeduction = Math.min(subtotal, appliedDiscount.value);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountDeduction);
  const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  const totalDue = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleApplyPromoCode = () => {
    if (!promoCodeInput.trim()) return;
    const cleanCode = promoCodeInput.trim().toUpperCase();
    const rule = discounts.find((d) => d.code.toUpperCase() === cleanCode);

    if (!rule) {
      toast.error("Invalid coupon code", {
        description: `Promo code "${cleanCode}" was not found. Try "ENTERPRISE10".`,
      });
      return;
    }

    if (!rule.isActive) {
      toast.error("Code Expired or Disabled", {
        description: `Promo code "${cleanCode}" is no longer active.`,
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (rule.startDate > today || rule.endDate < today) {
      toast.error("Code Out of Validity Window", {
        description: `This promotion was valid between ${rule.startDate} and ${rule.endDate}.`,
      });
      return;
    }

    if (rule.usageLimit && rule.usageCount >= rule.usageLimit) {
      toast.error("Usage Limit Reached", {
        description: `This discount code has exhausted its maximum redemption allowance.`,
      });
      return;
    }

    if (rule.minQuantity && quantity < rule.minQuantity) {
      toast.error("Minimum Seat Threshold Not Met", {
        description: `Code "${cleanCode}" requires a minimum of ${rule.minQuantity} seats. You have selected ${quantity}.`,
      });
      return;
    }

    if (rule.minPurchaseAmount && subtotal < rule.minPurchaseAmount) {
      toast.error("Minimum Purchase Value Not Met", {
        description: `Code "${cleanCode}" requires a minimum order subtotal of $${rule.minPurchaseAmount.toFixed(2)}.`,
      });
      return;
    }

    if (rule.productId && rule.productId !== selectedProduct?.id) {
      toast.error("Product Specific Discount", {
        description: `This promotion only applies to a specific product tier.`,
      });
      return;
    }

    setAppliedDiscount(rule);
    toast.success("Promo Code Applied!", {
      description: `${rule.name}: ${rule.discountType === "PERCENTAGE" ? `${rule.value}% OFF` : `-$${rule.value.toFixed(2)}`}`,
    });
  };

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedPlan || !user) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const nextDate = new Date();
      if (selectedPlan.billingPeriod === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
      else if (selectedPlan.billingPeriod === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
      else if (selectedPlan.billingPeriod === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (selectedPlan.billingPeriod === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

      // 1. Create Subscription in ACTIVE status
      const subRes = await api.createSubscription({
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        customerCompany: (user as any).companyName || "Apex Tech Labs",
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        billingPeriod: selectedPlan.billingPeriod,
        startDate: today,
        nextBillingDate: nextDate.toISOString().split("T")[0],
        paymentTerms: "Due on Receipt",
        status: "ACTIVE",
        lines: [
          {
            id: generateId("line"),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            variantId: selectedVariant?.id,
            variantName: selectedVariant?.name,
            variantExtra,
            quantity,
            unitPrice,
            taxRate: 18.0,
            lineSubtotal: subtotal,
          },
        ],
        subtotal,
        discountTotal: discountDeduction,
        taxTotal: taxAmount,
        totalAmount: totalDue,
        autoClose: selectedPlan.autoClose,
        pausable: selectedPlan.pausable,
      });

      // 2. Create Initial Invoice in CONFIRMED status
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const invRes = await api.createInvoice({
        subscriptionId: subRes.data.id,
        subscriptionNumber: subRes.data.subscriptionNumber,
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        customerCompany: (user as any).companyName || "Apex Tech Labs",
        subtotal,
        discountAmount: discountDeduction,
        taxAmount,
        total: totalDue,
        amountPaid: 0,
        status: "CONFIRMED",
        issueDate: today,
        dueDate: dueDate.toISOString().split("T")[0],
        lines: [
          {
            id: generateId("iline"),
            description: `${selectedProduct.name}${selectedVariant?.name ? ` (${selectedVariant.name})` : ""} - Initial Subscription Setup`,
            quantity,
            unitPrice: lineRate,
            discountAmount: discountDeduction,
            taxAmount,
            lineTotal: totalDue,
          },
        ],
        notes: `Subscription initialized online via Customer Store. Method: ${paymentMethod}.`,
      });

      // 3. Record Payment against this invoice (marks it PAID)
      await api.recordPayment({
        invoiceId: invRes.data.id,
        amount: totalDue,
        paymentMethod,
        referenceNumber: generateId("ORDER"),
        notes: `Instant checkout settlement for ${subRes.data.subscriptionNumber}.`,
      });

      // 4. Update promo usage count if applied
      if (appliedDiscount) {
        await api.updateDiscount(appliedDiscount.id, {
          usageCount: appliedDiscount.usageCount + 1,
        });
      }

      setIsCheckoutOpen(false);
      setSuccessReceipt({
        subscriptionNumber: subRes.data.subscriptionNumber,
        invoiceNumber: invRes.data.invoiceNumber,
        subscriptionId: subRes.data.id,
        invoiceId: invRes.data.id,
        totalPaid: totalDue,
        planName: selectedPlan.name,
        productName: selectedProduct.name,
        variantName: selectedVariant?.name,
      });

      toast.success("Subscription Activated!", {
        description: `Contract ${subRes.data.subscriptionNumber} and receipt ${invRes.data.invoiceNumber} generated.`,
      });
    } catch {
      toast.error("Failed to complete purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Software & Subscription Plans Catalog"
        description="Select a product tier, choose your brand integration variants (such as Odoo), configure seats, and activate recurring subscriptions instantly."
      />

      {/* Featured Callout Banner in Light Steel */}
      <div className="bg-white border border-[#dee2e6] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#e9ecef] border border-[#ced4da] flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-[#343a40]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#212529]">
              Launch or Upgrade Your Brightloop Suite
            </h3>
            <p className="text-xs text-[#6c757d] mt-0.5">
              Choose from core ERP software, POS cashier sync, and CRM modules. Add-ons like the <strong>Odoo Brand Integration</strong> add instant capabilities to your plan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#137333] font-semibold bg-[#e6f4ea] px-3 py-1.5 rounded-xl border border-[#ceead6]">
            Promo: Use Code &ldquo;ENTERPRISE10&rdquo; for 10% off
          </span>
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-xs text-[#6c757d]">
            Loading product catalog &amp; pricing plans...
          </div>
        ) : (
          products.map((product) => {
            const productPlans = plans.filter((p) => p.productId === product.id);

            return (
              <div
                key={product.id}
                className="bg-white border border-[#dee2e6] rounded-2xl p-6 flex flex-col justify-between hover:border-[#ced4da] transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#343a40] bg-[#e9ecef] px-2.5 py-0.5 rounded-full border border-[#ced4da]">
                      {product.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#212529]">
                      Base: ${product.salesPrice.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#212529] tracking-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#6c757d] mt-2 leading-relaxed min-h-[36px]">
                    {product.notes}
                  </p>

                  {/* Available Brand / Add-on Variants */}
                  <div className="mt-4 pt-3 border-t border-[#dee2e6] space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#495057] block">
                      Available Add-ons &amp; Brand Variants:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono ${
                            v.extraPrice > 0
                              ? "bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]"
                              : "bg-[#f8f9fa] text-[#6c757d] border-[#dee2e6]"
                          }`}
                        >
                          {v.name} {v.extraPrice > 0 ? `(+$${v.extraPrice})` : "($0)"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Associated Plans and Subscribe Action */}
                  <div className="mt-5 pt-3 border-t border-[#dee2e6] space-y-3">
                    <span className="text-[11px] font-semibold text-[#495057] block">
                      Select Plan &amp; Billing Cadence:
                    </span>
                    {productPlans.length === 0 ? (
                      <div className="p-3 bg-[#f8f9fa] rounded-xl text-xs text-[#6c757d] text-center">
                        Contact sales for custom enterprise quoting.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {productPlans.map((pl) => (
                          <div
                            key={pl.id}
                            className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] hover:border-[#ced4da] transition-all"
                          >
                            <div>
                              <div className="text-xs font-bold text-[#212529]">{pl.name}</div>
                              <div className="text-[11px] text-[#6c757d]">
                                ${pl.price.toFixed(2)} / {pl.billingPeriod.toLowerCase()} • Min {pl.minimumQuantity} seat(s)
                              </div>
                            </div>
                            <button
                              onClick={() => openCheckout(product, pl)}
                              className="inline-flex items-center gap-1.5 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              <span>Select</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#dee2e6] flex items-center justify-between text-[10px] text-[#6c757d]">
                  <span>Instant Portal Activation</span>
                  <span>18% GST Applicable</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checkout & Plan Customizer Modal */}
      {selectedProduct && selectedPlan && (
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title={`Subscribe to ${selectedProduct.name}`}
          description={`Selected Plan: ${selectedPlan.name} • ${selectedPlan.billingPeriod} recurring billing.`}
          maxWidth="xl"
        >
          <form onSubmit={handleCompletePurchase} className="space-y-5">
            {/* Step 1: Variant Selection */}
            {selectedProduct.variants.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1.5">
                  Select Product Variant / Integration Add-on:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedProduct.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8]"
                            : "bg-[#f8f9fa] border-[#dee2e6] text-[#212529] hover:border-[#ced4da]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{v.name}</span>
                          {v.extraPrice > 0 ? (
                            <span className="font-mono text-[#1a73e8]">+${v.extraPrice}</span>
                          ) : (
                            <span className="text-[#6c757d] font-normal">$0</span>
                          )}
                        </div>
                        {v.name.includes("Odoo") && (
                          <p className="text-[10px] text-[#495057] mt-1">
                            Includes dedicated Odoo brand sync integration.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Seats / Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">
                  License / Seat Quantity (Min: {selectedPlan.minimumQuantity})
                </label>
                <input
                  type="number"
                  min={selectedPlan.minimumQuantity || 1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className={`${inputCls} font-mono`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#495057] mb-1">
                  Billing Frequency
                </label>
                <div className="p-2 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl text-xs font-semibold font-mono text-[#343a40]">
                  {selectedPlan.billingPeriod} (Every {selectedPlan.billingPeriod.toLowerCase().replace("ly", "")})
                </div>
              </div>
            </div>

            {/* Step 3: Promo / Coupon Code Section */}
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">
                Have a Promo / Discount Code?
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-[#adb5bd] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="ENTERPRISE10"
                    className={`${inputCls} pl-10 font-mono`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromoCode}
                  className="bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#ced4da] transition-colors cursor-pointer"
                >
                  Apply Code
                </button>
              </div>
              {appliedDiscount && (
                <div className="mt-1.5 flex items-center justify-between p-2 bg-[#e6f4ea] rounded-xl border border-[#ceead6] text-xs text-[#137333]">
                  <span>Applied: {appliedDiscount.name} ({appliedDiscount.code})</span>
                  <span className="font-bold">
                    -{appliedDiscount.discountType === "PERCENTAGE" ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`}
                  </span>
                </div>
              )}
            </div>

            {/* Step 4: Transparent Financial Breakdown */}
            <div className="p-4 bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-[#6c757d]">
                <span>
                  Seats ({quantity} × ${lineRate.toFixed(2)}):
                </span>
                <span className="font-mono text-[#212529]">${subtotal.toFixed(2)}</span>
              </div>
              {discountDeduction > 0 && (
                <div className="flex justify-between text-[#137333]">
                  <span>Applied Discount ({appliedDiscount?.code}):</span>
                  <span className="font-mono">-${discountDeduction.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6c757d]">
                <span>GST Tax (18% on taxable base):</span>
                <span className="font-mono text-[#212529]">+${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#dee2e6] text-[#212529]">
                <span>Total Due Today:</span>
                <span className="font-mono text-[#137333]">${totalDue.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#6c757d] italic pt-1">
                Subsequent recurring invoices will bill automatically every {selectedPlan.billingPeriod.toLowerCase()}.
              </p>
            </div>

            {/* Step 5: Payment Method */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[#495057]">
                Payment Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["CARD", "BANK_TRANSFER", "UPI"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      paymentMethod === method
                        ? "bg-[#343a40] text-[#f8f9fa] border-[#212529]"
                        : "bg-white text-[#495057] border-[#ced4da] hover:bg-[#e9ecef]"
                    }`}
                  >
                    {method === "CARD" && "Credit / Debit Card"}
                    {method === "BANK_TRANSFER" && "Bank Wire / ACH"}
                    {method === "UPI" && "UPI Instant"}
                  </button>
                ))}
              </div>

              {paymentMethod === "CARD" && (
                <div className="space-y-3 p-3.5 bg-[#f8f9fa] rounded-xl border border-[#dee2e6]">
                  <div>
                    <label className="block text-[11px] text-[#6c757d] mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#6c757d] mb-1">Expires</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6c757d] mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-5 py-2.5 text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isSubmitting ? "Activating Subscription..." : `Pay $${totalDue.toFixed(2)} & Activate`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Success Confirmation Modal */}
      {successReceipt && (
        <Modal
          isOpen={!!successReceipt}
          onClose={() => setSuccessReceipt(null)}
          title="Subscription Successfully Activated!"
          description="Your payment has settled and your services are live."
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="p-4 bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6c757d]">Subscription Contract:</span>
                <span className="font-mono font-bold text-[#212529]">
                  {successReceipt.subscriptionNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6c757d]">Paid Invoice #:</span>
                <span className="font-mono font-bold text-[#212529]">
                  {successReceipt.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6c757d]">Purchased Tier:</span>
                <span className="font-semibold text-[#212529]">
                  {successReceipt.productName} ({successReceipt.planName})
                </span>
              </div>
              {successReceipt.variantName && (
                <div className="flex justify-between">
                  <span className="text-[#6c757d]">Add-on Integration:</span>
                  <span className="font-mono text-[#1a73e8]">
                    {successReceipt.variantName}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#dee2e6] font-bold text-sm">
                <span>Amount Settled:</span>
                <span className="font-mono text-[#137333]">
                  ${successReceipt.totalPaid.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Link
                href={`/portal/subscriptions/${successReceipt.subscriptionId}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View My Subscription</span>
              </Link>
              <Link
                href={`/portal/invoices/${successReceipt.invoiceId}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#ced4da] transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Official Receipt</span>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
