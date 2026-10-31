import React, { useState } from 'react';
import { db } from '../services/db';
import { Payment } from '../types';
import { CreditCard, Search, ArrowUpRight } from 'lucide-react';

interface PaymentsLedgerViewProps {
  onNavigateToInvoice: (invoiceId: string) => void;
}

export function PaymentsLedgerView({ onNavigateToInvoice }: PaymentsLedgerViewProps) {
  const [payments] = useState<Payment[]>(() => db.getPayments());
  const [search, setSearch] = useState('');

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.invoice_number.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q) ||
      p.payment_method.toLowerCase().includes(q) ||
      p.note.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Incoming Payments Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Multi-method receipts matched and posted against active invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-md text-xs w-72">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice, customer, method..."
            className="w-full bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-4 font-semibold">Payment ID</th>
              <th className="py-3 px-4 font-semibold">Target Invoice</th>
              <th className="py-3 px-4 font-semibold">Customer Account</th>
              <th className="py-3 px-4 font-semibold">Payment Method</th>
              <th className="py-3 px-4 font-semibold">Date Received</th>
              <th className="py-3 px-4 font-semibold">Transaction Note</th>
              <th className="py-3 px-4 font-semibold text-right">Amount Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-mono text-slate-500">{pay.id}</td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                  <button
                    onClick={() => onNavigateToInvoice(pay.invoice_id)}
                    className="hover:underline text-blue-600 flex items-center gap-1"
                  >
                    <span>{pay.invoice_number}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-800">{pay.customer_name}</td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {pay.payment_method.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{pay.payment_date}</td>
                <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                  {pay.note || 'Direct payment settlement'}
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-emerald-600">
                  +${pay.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
