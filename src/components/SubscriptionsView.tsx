import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import {
  BillingPeriod,
  QuotationTemplate,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
} from '../types';
import {
  Plus,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  FileCheck,
  ChevronRight,
  Eye,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';

interface SubscriptionsViewProps {
  initialSubId?: string;
}

export function SubscriptionsView({ initialSubId }: SubscriptionsViewProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';
  const isStaff = currentUser.role === 'STAFF';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    db.getSubscriptions()
  );
  const [templates, setTemplates] = useState<QuotationTemplate[]>(() =>
    db.getTemplates()
  );
  const [products] = useState(() => db.getProducts());
  const [plans] = useState(() => db.getPlans());
  const [users] = useState(() => db.getUsers().filter((u) => u.role === 'CUSTOMER'));

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'TEMPLATES'>('SUBSCRIPTIONS');

  // Selected subscription detail modal
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(() => {
    if (initialSubId) {
      return db.getSubscriptionById(initialSubId) || null;
    }
    return null;
  });

  // Create Subscription from Template modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    users[0]?.id || ''
  );
  const [subDiscountCode, setSubDiscountCode] = useState('ODOO560');
  const [subPaymentTerms, setSubPaymentTerms] = useState('Net 15');

  const filteredSubs = subscriptions.filter((s) =>
    statusFilter === 'ALL' ? true : s.status === statusFilter
  );

  const handleAdvanceStatus = (sub: Subscription) => {
    let nextStatus: SubscriptionStatus | null = null;
    switch (sub.status) {
      case 'DRAFT':
        nextStatus = 'QUOTATION';
        break;
      case 'QUOTATION':
        nextStatus = 'CONFIRMED';
        break;
      case 'CONFIRMED':
        nextStatus = 'ACTIVE';
        break;
      case 'ACTIVE':
        nextStatus = 'CLOSED';
        break;
      default:
        break;
    }

    if (nextStatus) {
      db.updateSubscriptionStatus(sub.id, nextStatus);
      const updated = db.getSubscriptions();
      setSubscriptions(updated);
      if (selectedSub && selectedSub.id === sub.id) {
        setSelectedSub(db.getSubscriptionById(sub.id) || null);
      }
    }
  };

  const handleCreateFromTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const template = templates.find((t) => t.id === selectedTemplateId);
    const customer = users.find((u) => u.id === selectedCustomerId);
    if (!template || !customer) return;

    const plan = plans.find((p) => p.id === template.plan_id) || plans[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + template.valid_days * 86400000)
      .toISOString()
      .split('T')[0];

    // Build subscription lines from template lines
    const lines: SubscriptionLine[] = template.lines.map((tl, idx) => {
      const prod = products.find((p) => p.id === tl.product_id);
      const variant = prod?.variants.find((v) => v.id === tl.variant_id);
      return {
        id: `line-${Date.now()}-${idx}`,
        product_id: tl.product_id,
        product_name: prod ? prod.name : 'Product',
        variant_id: tl.variant_id,
        variant_name: variant ? variant.name : undefined,
        quantity: tl.quantity,
        unit_price: tl.unit_price,
        tax_id: tl.tax_id,
        tax_rate: '18.00',
      };
    });

    const newSub = db.saveSubscription({
      customer_id: customer.id,
      customer_name: `${customer.name} (${customer.company_name || 'Direct'})`,
      customer_email: customer.email,
      plan_id: plan.id,
      plan_name: plan.name,
      billing_period: plan.billing_period,
      status: 'QUOTATION',
      start_date: todayStr,
      expiry_date: expiryDate,
      next_billing_date: todayStr,
      payment_terms: subPaymentTerms,
      discount_code: subDiscountCode,
      auto_close: plan.auto_close,
      closable: plan.closable,
      lines,
    });

    setSubscriptions(db.getSubscriptions());
    setSelectedSub(newSub);
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscriptions & Quotations
          </h1>
          <p className="text-sm text-slate-500">
            Lifecycle state machine: Draft → Quotation → Confirmed → Active → Closed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
            <button
              onClick={() => setActiveTab('SUBSCRIPTIONS')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                activeTab === 'SUBSCRIPTIONS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              All Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('TEMPLATES')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                activeTab === 'TEMPLATES'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Quotation Templates ({templates.length})
            </button>
          </div>

          {(isAdmin || isStaff) && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quote from Template</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'SUBSCRIPTIONS' ? (
        <>
          {/* Status Segment Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Subscription #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Plan & Cadence</th>
                  <th className="py-3 px-4 font-semibold">Lifecycle Status</th>
                  <th className="py-3 px-4 font-semibold">Next Billing</th>
                  <th className="py-3 px-4 font-semibold">Discount Code</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      <button
                        onClick={() => setSelectedSub(sub)}
                        className="hover:underline text-blue-600 font-bold"
                      >
                        {sub.subscription_number}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{sub.customer_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{sub.plan_name}</div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {sub.billing_period}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : sub.status === 'QUOTATION'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : sub.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{sub.next_billing_date}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {sub.discount_code ? (
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                          {sub.discount_code}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="px-2.5 py-1 text-xs border border-slate-300 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                        >
                          View Lines
                        </button>

                        {sub.status !== 'CLOSED' && (isAdmin || isStaff) && (
                          <button
                            onClick={() => handleAdvanceStatus(sub)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors flex items-center gap-1"
                          >
                            <span>
                              {sub.status === 'DRAFT'
                                ? 'Quote'
                                : sub.status === 'QUOTATION'
                                ? 'Confirm'
                                : sub.status === 'CONFIRMED'
                                ? 'Activate'
                                : 'Close'}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Quotation Templates Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tmpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tmpl.notes}</p>
                </div>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                  Valid {tmpl.valid_days} Days
                </span>
              </div>

              <div className="border-t border-b border-slate-100 py-3 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Pre-configured Lines ({tmpl.lines.length})
                </div>
                {tmpl.lines.map((tl, i) => {
                  const prod = products.find((p) => p.id === tl.product_id);
                  const variant = prod?.variants.find((v) => v.id === tl.variant_id);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-200"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{prod?.name || 'Product'}</div>
                        {variant && (
                          <div className="text-[11px] text-slate-500">{variant.name}</div>
                        )}
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-slate-500">{tl.quantity} × </span>
                        <span className="font-semibold text-slate-900">${tl.unit_price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setCreateModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  Create Quote From This Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedSub.subscription_number}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {selectedSub.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer: {selectedSub.customer_name} ({selectedSub.customer_email})
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lifecycle Progress Stepper */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Subscription Lifecycle Stage
              </div>
              <div className="flex items-center justify-between">
                {['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((step, idx) => {
                  const isCurrent = selectedSub.status === step;
                  const isPast =
                    ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].indexOf(
                      selectedSub.status
                    ) >= idx;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${
                          isCurrent
                            ? 'bg-slate-900 text-white ring-2 ring-slate-300'
                            : isPast
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 mt-1">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terms and Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/50 p-3 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Billing Cadence</span>
                <span className="font-semibold text-slate-900">{selectedSub.billing_period}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Next Billing Date</span>
                <span className="font-semibold font-mono text-slate-900">
                  {selectedSub.next_billing_date}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Payment Terms</span>
                <span className="font-semibold text-slate-900">{selectedSub.payment_terms}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Discount Code</span>
                <span className="font-semibold font-mono text-purple-700">
                  {selectedSub.discount_code || 'None'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Configured Product Lines
              </div>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2 px-3 font-semibold">Product & Variant</th>
                      <th className="py-2 px-3 font-semibold text-right">Quantity</th>
                      <th className="py-2 px-3 font-semibold text-right">Unit Price</th>
                      <th className="py-2 px-3 font-semibold text-right">Tax Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSub.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">{line.product_name}</div>
                          {line.variant_name && (
                            <div className="text-[11px] text-slate-500">{line.variant_name}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {line.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                          ${line.unit_price}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                          {line.tax_rate || '18.00'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors text-xs"
              >
                Close
              </button>

              {selectedSub.status !== 'CLOSED' && (isAdmin || isStaff) && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedSub)}
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5"
                >
                  <span>Advance Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Quote from Template Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                New Quotation from Template
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFromTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Choose Quotation Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Valid {t.valid_days} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.company_name || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Discount Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={subDiscountCode}
                    onChange={(e) => setSubDiscountCode(e.target.value)}
                    placeholder="e.g. ODOO560 or GROWTH15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={subPaymentTerms}
                    onChange={(e) => setSubPaymentTerms(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Immediate">Immediate / Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-[11px] leading-relaxed">
                The new subscription will be created in <strong>QUOTATION</strong> status.
                Lines, quantities, variant surcharges, and tax rates will be populated from the template.
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
