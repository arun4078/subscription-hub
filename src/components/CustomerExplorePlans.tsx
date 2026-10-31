import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { BillingPeriod, Plan, Product, ProductVariant, Subscription } from '../types';
import { Check, X } from 'lucide-react';
import { toCents, toMoney } from '../services/billing';

interface CustomerExplorePlansProps {
  onSubscriptionCreated: (newSub: Subscription) => void;
}

export function CustomerExplorePlans({ onSubscriptionCreated }: CustomerExplorePlansProps) {
  const { currentUser } = useAuth();
  const plans = db.getPlans();
  const products = db.getProducts();
  const taxes = db.getTaxes();
  const discounts = db.getDiscounts();

  // Primary software license product containing the brand variants (Odoo, Cloud, Standard)
  const coreProduct =
    products.find((p) => p.type === 'SOFTWARE_LICENSE') || products[0];

  const [cadenceFilter, setCadenceFilter] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    coreProduct?.variants[1]?.id || coreProduct?.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(selectedPlan?.min_quantity || 1);
  const [discountCode, setDiscountCode] = useState('ODOO560');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredPlans = plans.filter((p) =>
    cadenceFilter === 'ALL' ? true : p.billing_period === cadenceFilter
  );

  const selectedVariant = coreProduct?.variants.find((v) => v.id === selectedVariantId);
  const variantExtraCents = selectedVariant ? toCents(selectedVariant.extra_price) : 0;
  const planBaseCents = selectedPlan ? toCents(selectedPlan.price) : 0;
  const unitPriceCents = planBaseCents + variantExtraCents;
  const subtotalCents = unitPriceCents * quantity;

  // Check discount
  const activeDiscount = discounts.find(
    (d) => d.code.toUpperCase() === discountCode.trim().toUpperCase()
  );
  let discountCents = 0;
  if (activeDiscount) {
    if (activeDiscount.discount_type === 'PERCENTAGE') {
      discountCents = Math.round((subtotalCents * parseFloat(activeDiscount.value)) / 100);
    } else {
      discountCents = toCents(activeDiscount.value);
    }
  }
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const defaultTaxRate = parseFloat(taxes[0]?.rate || '18.00') / 100;
  const taxCents = Math.round(taxableCents * defaultTaxRate);
  const totalCents = taxableCents + taxCents;

  const handleOpenSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
    setQuantity(plan.min_quantity || 1);
    setSubscribeModalOpen(true);
  };

  const handleConfirmSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    const newSub = db.saveSubscription({
      customer_id: currentUser.id,
      customer_name: `${currentUser.name} (${currentUser.company_name || 'Direct'})`,
      customer_email: currentUser.email,
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      billing_period: selectedPlan.billing_period,
      status: 'ACTIVE',
      start_date: todayStr,
      expiry_date: expiryDate,
      next_billing_date: todayStr,
      payment_terms: paymentTerms,
      discount_code: discountCode.trim().toUpperCase() || undefined,
      auto_close: selectedPlan.auto_close,
      closable: selectedPlan.closable,
      lines: [
        {
          id: `line-${Date.now()}-1`,
          product_id: coreProduct.id,
          product_name: coreProduct.name,
          variant_id: selectedVariant?.id,
          variant_name: selectedVariant ? `${selectedVariant.name} (+${selectedVariant.extra_price})` : undefined,
          quantity: quantity,
          unit_price: toMoney(unitPriceCents),
          tax_id: taxes[0]?.id,
          tax_rate: taxes[0]?.rate || '18.00',
        },
      ],
    });

    setSuccessMessage(`Successfully subscribed to ${selectedPlan.name}! Subscription ${newSub.subscription_number} is now active.`);
    setSubscribeModalOpen(false);
    onSubscriptionCreated(newSub);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Available Plans & Brand Editions
          </h1>
          <p className="text-sm text-slate-500">
            Choose your subscription cadence, configure edition brands (like Odoo Brand Edition), and activate immediately.
          </p>
        </div>

        {/* Cadence Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          {['ALL', 'MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY'].map((c) => (
            <button
              key={c}
              onClick={() => setCadenceFilter(c)}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                cadenceFilter === c
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c === 'ALL' ? 'All Cadences' : c}
            </button>
          ))}
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 font-medium">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Featured Brand Editions Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Select Your Core Brand &amp; Architecture Edition
            </h2>
            <p className="text-xs text-slate-500">
              Brightloop integrates with major enterprise software architectures. Select your required brand edition variant:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {coreProduct.variants.map((v) => {
            const isSelected = selectedVariantId === v.id;
            const extraNum = parseFloat(v.extra_price || '0');
            const formattedPrice = extraNum > 0
              ? `+ $${extraNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / unit`
              : 'Included (Standard)';

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVariantId(v.id)}
                className={`p-5 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-slate-950 bg-white shadow-xs'
                    : 'border border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">{v.name}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {v.name.includes('Odoo')
                    ? 'Full two-way synchronization with Odoo ERP modules and database.'
                    : v.name.includes('Cloud')
                    ? 'Isolated dedicated cloud environment with 99.99% uptime guarantee.'
                    : 'Multi-tenant standard cloud deployment for agile teams.'}
                </div>

                <div className="font-mono text-xs font-semibold text-slate-900">
                  {formattedPrice}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredPlans.map((plan) => {
          const isSelected = selectedPlan.id === plan.id;
          const planUnitCostCents = toCents(plan.price) + variantExtraCents;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-lg border p-6 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-slate-900 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-mono uppercase tracking-wider">{plan.billing_period}</span>
                  {plan.closable && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      Cancel Anytime
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>

                {/* Price Display */}
                <div className="my-5">
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    ${toMoney(planUnitCostCents)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    per unit / {plan.billing_period.toLowerCase()}
                  </div>
                  {variantExtraCents > 0 && selectedVariant && (
                    <div className="text-[11px] text-purple-700 font-mono mt-0.5">
                      Includes {selectedVariant.name} (+${selectedVariant.extra_price})
                    </div>
                  )}
                </div>

                {/* Plan Highlights */}
                <div className="space-y-2 py-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Minimum Order: {plan.min_quantity} seat(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Full Customer Self-Service Portal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{plan.auto_close ? 'Auto-closes on term end' : 'Auto-renewing recurring billing'}</span>
                  </div>
                </div>
              </div>

                <button
                  onClick={() => handleOpenSubscribe(plan)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-xs transition-colors shadow-xs"
                >
                  Select &amp; Subscribe
                </button>
            </div>
          );
        })}
      </div>

      {/* Subscribe Checkout Modal */}
      {subscribeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Subscription Order
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: {currentUser.name} ({currentUser.company_name || currentUser.email})
                </p>
              </div>
              <button
                onClick={() => setSubscribeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSubscribe} className="space-y-4 text-xs">
              {/* Summary box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Selected Plan:</span>
                  <span>{selectedPlan.name} ({selectedPlan.billing_period})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Brand Edition:</span>
                  <span className="font-mono text-purple-700">
                    {selectedVariant?.name || 'Standard Edition'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Number of Seats / Units
                  </label>
                  <input
                    type="number"
                    min={selectedPlan.min_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(selectedPlan.min_quantity, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Immediate">Immediate / Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Promo Discount Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="e.g. ODOO560 or GROWTH15"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded font-mono uppercase focus:outline-none"
                  />
                  {activeDiscount && (
                    <span className="px-2.5 py-2 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px] flex items-center gap-1 border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      <span>Valid Code</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Price Calculation breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Unit Price:</span>
                  <span>${toMoney(unitPriceCents)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({quantity} seat{quantity > 1 ? 's' : ''}):</span>
                  <span>${toMoney(subtotalCents)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Discount ({activeDiscount?.name}):</span>
                    <span>-${toMoney(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({taxes[0]?.name || '18%'}):</span>
                  <span>+${toMoney(taxCents)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                  <span>Total Due Per Cycle:</span>
                  <span>${toMoney(totalCents)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubscribeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <span>Activate Subscription</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
