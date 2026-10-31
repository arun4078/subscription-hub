import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Plus, UserCheck, Shield, Mail, X } from 'lucide-react';

export function StaffManagementView() {
  const { allUsers, currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';

  const [staffList, setStaffList] = useState<User[]>(() =>
    db.getUsers().filter((u) => u.role === 'STAFF')
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Finance & Billing');
  const [error, setError] = useState<string | null>(null);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      db.addUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'STAFF',
        company_name: `Brightloop Internal (${department})`,
      });
      setStaffList(db.getUsers().filter((u) => u.role === 'STAFF'));
      setModalOpen(false);
      setName('');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to add staff member');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Internal Staff Management (Admin Only)
          </h1>
          <p className="text-sm text-slate-500">
            Internal operators with access to subscriptions, billing execution, and finance dashboards.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-4 font-semibold">Staff Member</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Department / Role</th>
              <th className="py-3 px-4 font-semibold">Access Permissions</th>
              <th className="py-3 px-4 font-semibold">Date Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{st.name}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{st.email}</td>
                <td className="py-3.5 px-4 text-slate-700">
                  {st.company_name || 'Brightloop Operations'}
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Operations & Billing Guard
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                  {st.created_at.split('T')[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Internal Staff Member</h3>
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

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@brightloop.io"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none"
                >
                  <option value="Finance & Billing">Finance & Billing</option>
                  <option value="Enterprise Sales">Enterprise Sales</option>
                  <option value="Account Management">Account Management</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                Rule Check: Only an ADMIN user can provision staff accounts. Staff have access to
                create subscriptions from templates, run batch billing, and reconcile payments.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
