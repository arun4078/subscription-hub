import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { BillingPeriod, Plan } from '../types';
import { Plus, Edit2, Trash2, Check, X, Calendar, RefreshCcw } from 'lucide-react';

export function PlansView() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';

  const [plans, setPlans] = useState<Plan[]>(() => db.getPlans());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('1200.00');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [minQuantity, setMinQuantity] = useState(1);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2028-12-31');
  const [autoClose, setAutoClose] = useState(false);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(false);
  const [renewable, setRenewable] = useState(true);
  const [description, setDescription] = useState('');

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPrice('1200.00');
    setBillingPeriod('MONTHLY');
    setMinQuantity(1);
    setStartDate('2026-01-01');
    setEndDate('2028-12-31');
    setAutoClose(false);
    setClosable(true);
    setPausable(false);
    setRenewable(true);
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setBillingPeriod(plan.billing_period);
    setMinQuantity(plan.min_quantity);
    setStartDate(plan.start_date);
    setEndDate(plan.end_date);
    setAutoClose(plan.auto_close);
    setClosable(plan.closable);
    setPausable(plan.pausable);
    setRenewable(plan.renewable);
    setDescription(plan.description);
    setModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.savePlan({
      id: editingPlan ? editingPlan.id : undefined,
      name: name.trim(),
      price: parseFloat(price || '0').toFixed(2),
      billing_period: billingPeriod,
      min_quantity: minQuantity,
      start_date: startDate,
      end_date: endDate,
      auto_close: autoClose,
      closable,
      pausable,
      renewable,
      description: description.trim(),
    });

    setPlans(db.getPlans());
    setModalOpen(false);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      db.deletePlan(id);
      setPlans(db.getPlans());
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription Plans & Cadence
          </h1>
          <p className="text-sm text-slate-500">
            Configure recurring billing frequency (Daily, Weekly, Monthly, Yearly) and lifecycle policies.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  {plan.billing_period} Cadence
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>

              <div className="mt-4 mb-4">
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  ${plan.price}
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    /{plan.billing_period.toLowerCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Min Order Quantity: {plan.min_quantity} seat(s)
                </div>
              </div>

              {/* Policy Rules */}
              <div className="space-y-1.5 py-3 border-t border-slate-100 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Auto-close at Expiry:</span>
                  <span className={plan.auto_close ? 'text-amber-600 font-medium' : 'text-slate-700'}>
                    {plan.auto_close ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer Can Close:</span>
                  <span className={plan.closable ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {plan.closable ? 'Yes (Portal allowed)' : 'Contract locked'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pausable / Renewable:</span>
                  <span className="text-slate-700">
                    {plan.pausable ? 'Pausable' : 'Continuous'} · {plan.renewable ? 'Renewable' : 'One-off'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
              Valid: {plan.start_date} to {plan.end_date}
            </div>
          </div>
        ))}
      </div>

      {/* Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan ? 'Edit Billing Plan' : 'Create Billing Plan'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Scale Monthly"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Cadence</label>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:border-slate-900 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Terms and target audience for this tier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Policy Options Checkboxes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="font-semibold text-slate-800">Plan Lifecycle Rules</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClose}
                    onChange={(e) => setAutoClose(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Auto-close on expiration date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closable}
                    onChange={(e) => setClosable(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Customer closable early via portal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pausable}
                    onChange={(e) => setPausable(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Allow subscription pausing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewable}
                    onChange={(e) => setRenewable(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Auto-renewable contract</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
