import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { DiscountRule, DiscountType, TaxRule } from '../types';
import { Plus, Edit2, Trash2, Tag, Percent, Calendar, X } from 'lucide-react';

export function DiscountsAndTaxesView() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';

  const [taxes, setTaxes] = useState<TaxRule[]>(() => db.getTaxes());
  const [discounts, setDiscounts] = useState<DiscountRule[]>(() => db.getDiscounts());
  const [products] = useState(() => db.getProducts());

  // Tax Modal State
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('18.00');

  // Discount Modal State
  const [discModalOpen, setDiscModalOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscountRule | null>(null);
  const [discCode, setDiscCode] = useState('');
  const [discName, setDiscName] = useState('');
  const [discType, setDiscType] = useState<DiscountType>('PERCENTAGE');
  const [discValue, setDiscValue] = useState('10.00');
  const [minPurchase, setMinPurchase] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2027-12-31');
  const [maxUses, setMaxUses] = useState(100);
  const [appliesTo, setAppliesTo] = useState<'WHOLE_SUBSCRIPTION' | 'SPECIFIC_PRODUCT'>(
    'WHOLE_SUBSCRIPTION'
  );
  const [productId, setProductId] = useState<string>('');

  // Tax Handlers
  const openTaxModal = (tax?: TaxRule) => {
    if (tax) {
      setEditingTax(tax);
      setTaxName(tax.name);
      setTaxRate(tax.rate);
    } else {
      setEditingTax(null);
      setTaxName('');
      setTaxRate('18.00');
    }
    setTaxModalOpen(true);
  };

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim()) return;
    db.saveTax({
      id: editingTax ? editingTax.id : undefined,
      name: taxName.trim(),
      rate: parseFloat(taxRate || '0').toFixed(2),
      is_active: true,
    });
    setTaxes(db.getTaxes());
    setTaxModalOpen(false);
  };

  const handleDeleteTax = (id: string) => {
    if (confirm('Delete this tax rule?')) {
      db.deleteTax(id);
      setTaxes(db.getTaxes());
    }
  };

  // Discount Handlers
  const openDiscModal = (disc?: DiscountRule) => {
    if (disc) {
      setEditingDisc(disc);
      setDiscCode(disc.code);
      setDiscName(disc.name);
      setDiscType(disc.discount_type);
      setDiscValue(disc.value);
      setMinPurchase(disc.min_purchase || '');
      setMinQuantity(disc.min_quantity ? String(disc.min_quantity) : '');
      setStartDate(disc.start_date);
      setEndDate(disc.end_date);
      setMaxUses(disc.max_uses);
      setAppliesTo(disc.applies_to);
      setProductId(disc.product_id || '');
    } else {
      setEditingDisc(null);
      setDiscCode('');
      setDiscName('');
      setDiscType('PERCENTAGE');
      setDiscValue('10.00');
      setMinPurchase('');
      setMinQuantity('');
      setStartDate('2026-01-01');
      setEndDate('2027-12-31');
      setMaxUses(100);
      setAppliesTo('WHOLE_SUBSCRIPTION');
      setProductId(products[0]?.id || '');
    }
    setDiscModalOpen(true);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discCode.trim() || !discName.trim()) return;

    db.saveDiscount({
      id: editingDisc ? editingDisc.id : undefined,
      code: discCode.trim().toUpperCase(),
      name: discName.trim(),
      discount_type: discType,
      value: parseFloat(discValue || '0').toFixed(2),
      min_purchase: minPurchase ? parseFloat(minPurchase).toFixed(2) : undefined,
      min_quantity: minQuantity ? parseInt(minQuantity, 10) : undefined,
      start_date: startDate,
      end_date: endDate,
      max_uses: maxUses,
      applies_to: appliesTo,
      product_id: appliesTo === 'SPECIFIC_PRODUCT' ? productId : undefined,
    });

    setDiscounts(db.getDiscounts());
    setDiscModalOpen(false);
  };

  const handleDeleteDiscount = (id: string) => {
    if (confirm('Delete this discount rule?')) {
      db.deleteDiscount(id);
      setDiscounts(db.getDiscounts());
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Discounts & Tax Configuration (Admin Only)
        </h1>
        <p className="text-sm text-slate-500">
          Admin-defined pricing rules. Active discounts apply automatically to recurring billing cycles.
        </p>
      </div>

      {/* Section 1: Discount Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              <span>Automated Discount Rules</span>
            </h2>
            <p className="text-xs text-slate-500">
              Discounts trigger on billing day based on date validity, seat thresholds, and usage limits.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => openDiscModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Discount</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Promo Code</th>
                <th className="py-2.5 px-4 font-semibold">Rule Name</th>
                <th className="py-2.5 px-4 font-semibold">Type & Value</th>
                <th className="py-2.5 px-4 font-semibold">Applies To</th>
                <th className="py-2.5 px-4 font-semibold">Usage & Limits</th>
                <th className="py-2.5 px-4 font-semibold">Active Window</th>
                {isAdmin && <th className="py-2.5 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => {
                const isExhausted = d.max_uses > 0 && d.times_used >= d.max_uses;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{d.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {d.discount_type === 'PERCENTAGE' ? `${d.value}% Off` : `$${d.value} Flat Off`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {d.applies_to === 'WHOLE_SUBSCRIPTION'
                        ? 'Whole Subscription'
                        : `Product: ${products.find((p) => p.id === d.product_id)?.name || 'Specific'}`}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={isExhausted ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                        {d.times_used} / {d.max_uses} uses
                      </span>
                      {isExhausted && (
                        <span className="block text-[10px] text-rose-500 font-semibold uppercase">
                          Limit Reached
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {d.start_date} to {d.end_date}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDiscModal(d)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(d.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Tax Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Tax Jurisdictions & Rates</span>
            </h2>
            <p className="text-xs text-slate-500">
              Tax calculated on line items after discount is applied, rounded half up.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => openTaxModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Tax Rate</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Tax Name</th>
                <th className="py-2.5 px-4 font-semibold text-right">Tax Percentage (%)</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                {isAdmin && <th className="py-2.5 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{t.name}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-slate-900">
                    {t.rate}%
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openTaxModal(t)}
                          className="p-1 text-slate-500 hover:text-slate-900 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTax(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Modal */}
      {taxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </h3>
              <button
                onClick={() => setTaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTax} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tax Label</label>
                <input
                  type="text"
                  required
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g. GST Standard (18%)"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Percentage Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTaxModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white rounded font-semibold"
                >
                  Save Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingDisc ? 'Edit Discount Rule' : 'New Discount Rule'}
              </h3>
              <button
                onClick={() => setDiscModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Promo Code</label>
                  <input
                    type="text"
                    required
                    value={discCode}
                    onChange={(e) => setDiscCode(e.target.value)}
                    placeholder="e.g. ODOO560"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={discName}
                    onChange={(e) => setDiscName(e.target.value)}
                    placeholder="e.g. Odoo Migration Rebate"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discType}
                    onChange={(e) => setDiscType(e.target.value as DiscountType)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Value ({discType === 'PERCENTAGE' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={discValue}
                    onChange={(e) => setDiscValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Purchase ($ Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    placeholder="e.g. 2000.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Quantity (Seats Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Applies Scope</label>
                  <select
                    value={appliesTo}
                    onChange={(e) =>
                      setAppliesTo(e.target.value as 'WHOLE_SUBSCRIPTION' | 'SPECIFIC_PRODUCT')
                    }
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none"
                  >
                    <option value="WHOLE_SUBSCRIPTION">Whole Subscription</option>
                    <option value="SPECIFIC_PRODUCT">Specific Product Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Max Usages</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 100)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>
              </div>

              {appliesTo === 'SPECIFIC_PRODUCT' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Select Target Product
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDiscModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors"
                >
                  Save Discount Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
