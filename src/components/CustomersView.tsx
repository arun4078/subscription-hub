import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Plus, Users, Mail, Phone, Building, Check, X } from 'lucide-react';

export function CustomersView() {
  const { allUsers, currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';
  const isStaff = currentUser.role === 'STAFF';

  const [users, setUsers] = useState<User[]>(() =>
    db.getUsers().filter((u) => u.role === 'CUSTOMER')
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      db.addUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'CUSTOMER',
        company_name: companyName.trim(),
        phone: phone.trim(),
      });
      setUsers(db.getUsers().filter((u) => u.role === 'CUSTOMER'));
      setModalOpen(false);
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    }
  };

  const subscriptions = db.getSubscriptions();
  const invoices = db.getInvoices();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500">
            Enterprise clients and small business accounts purchasing Brightloop software.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Customer Record</span>
          </button>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-4 font-semibold">Customer / Contact</th>
              <th className="py-3 px-4 font-semibold">Company</th>
              <th className="py-3 px-4 font-semibold">Email & Phone</th>
              <th className="py-3 px-4 font-semibold text-center">Active Subs</th>
              <th className="py-3 px-4 font-semibold text-right">Total Invoices</th>
              <th className="py-3 px-4 font-semibold">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((cust) => {
              const custSubs = subscriptions.filter(
                (s) => s.customer_id === cust.id && s.status === 'ACTIVE'
              );
              const custInvoices = invoices.filter((i) => i.customer_id === cust.id);
              return (
                <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{cust.name}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {cust.company_name || 'Individual'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-slate-600">{cust.email}</div>
                    {cust.phone && (
                      <div className="text-[11px] text-slate-400 font-mono">{cust.phone}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                    {custSubs.length}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {custInvoices.length} invoices
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {cust.created_at.split('T')[0]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Customer Account</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Johnathan Miller"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Industrial Global"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@apexindustrial.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                />
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
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
