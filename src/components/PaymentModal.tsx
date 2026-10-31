import React, { useState } from 'react';
import { db } from '../services/db';
import { Invoice, PaymentMethod } from '../types';
import { getTodayIso } from '../services/billing';
import { X, Check } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

type UpiMode = 'ID' | 'QR';

export function PaymentModal({ invoice, onClose, onPaymentSuccess }: PaymentModalProps) {
  if (!invoice) return null;

  const [amount, setAmount] = useState(invoice.balance_amount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [paymentDate, setPaymentDate] = useState(getTodayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Card specific state (Credit & Debit)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(invoice.customer_name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardNetwork, setCardNetwork] = useState<'Visa' | 'MasterCard' | 'RuPay' | 'Amex' | 'Card'>('Card');

  // UPI specific state
  const [upiMode, setUpiMode] = useState<UpiMode>('ID');
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | null>('gpay');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [netBankingRef, setNetBankingRef] = useState('');

  // Bank Transfer state
  const [wireRef, setWireRef] = useState('');

  // Cash / Other state
  const [cashVoucher, setCashVoucher] = useState('');

  const handleCardNumberChange = (val: string) => {
    // Only numbers
    const clean = val.replace(/\D/g, '').slice(0, 16);
    // Format into 4-digit groups
    const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    // Auto detect network
    if (clean.startsWith('4')) {
      setCardNetwork('Visa');
    } else if (clean.startsWith('51') || clean.startsWith('52') || clean.startsWith('53') || clean.startsWith('54') || clean.startsWith('55')) {
      setCardNetwork('MasterCard');
    } else if (clean.startsWith('60') || clean.startsWith('65') || clean.startsWith('81') || clean.startsWith('82')) {
      setCardNetwork('RuPay');
    } else if (clean.startsWith('34') || clean.startsWith('37')) {
      setCardNetwork('Amex');
    } else {
      setCardNetwork('Card');
    }
  };

  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const handleUpiAppendHandle = (handle: string) => {
    const prefix = upiId.split('@')[0] || 'customer';
    setUpiId(`${prefix}${handle}`);
  };

  const getMethodLabel = (method: PaymentMethod): string => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'DEBIT_CARD':
        return 'Debit Card';
      case 'UPI':
        return 'UPI';
      case 'NET_BANKING':
        return 'Net Banking';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CASH':
        return 'Cash';
      case 'CARD':
        return 'Card';
      default:
        return 'Other';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payNum = parseFloat(amount || '0');
    if (isNaN(payNum) || payNum <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }
    if (payNum > parseFloat(invoice.balance_amount)) {
      setError(`Payment cannot exceed the outstanding balance of $${invoice.balance_amount}.`);
      return;
    }

    // Build automated note based on method
    let autoRef = note.trim();
    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
      const last4 = cardNumber.replace(/\s/g, '').slice(-4) || '7109';
      const label = paymentMethod === 'CREDIT_CARD' ? 'Credit Card' : 'Debit Card';
      autoRef = autoRef || `${label} (${cardNetwork} •••• ${last4}) - Auth #AUTH-${Date.now().toString().slice(-6)}`;
    } else if (paymentMethod === 'UPI') {
      const vpa = upiId.trim() || 'customer@upi';
      autoRef = autoRef || `UPI Ref #UPI-${Date.now().toString().slice(-8)} (VPA: ${vpa})`;
    } else if (paymentMethod === 'NET_BANKING') {
      autoRef = autoRef || `Net Banking (${selectedBank}) Ref #${netBankingRef || Date.now().toString().slice(-7)}`;
    } else if (paymentMethod === 'BANK_TRANSFER') {
      autoRef = autoRef || `Wire / NEFT / RTGS Ref #${wireRef || 'WIRE-' + Date.now().toString().slice(-6)}`;
    } else if (paymentMethod === 'CASH') {
      autoRef = autoRef || `Cash Receipt Voucher #${cashVoucher || 'VCH-' + Date.now().toString().slice(-5)}`;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        db.recordPayment({
          invoice_id: invoice.id,
          amount: payNum.toFixed(2),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          note: autoRef,
        });
        setIsProcessing(false);
        onPaymentSuccess();
        onClose();
      } catch (err: any) {
        setIsProcessing(false);
        setError(err.message || 'Failed to record payment.');
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Make Payment</h3>
            <p className="text-xs text-slate-500 font-mono">Invoice: {invoice.invoice_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
            {error}
          </div>
        )}

        {/* Invoice Summary Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-900">{invoice.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Invoice Amount:</span>
            <span className="font-mono font-semibold">${invoice.total_amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Already Paid:</span>
            <span className="font-mono text-emerald-600">${invoice.paid_amount}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
            <span>Outstanding Balance:</span>
            <span className="font-mono text-rose-600">${invoice.balance_amount}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Payment Amount and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Payment Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                max={invoice.balance_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'CREDIT_CARD' as PaymentMethod, label: 'Credit Card' },
                { id: 'DEBIT_CARD' as PaymentMethod, label: 'Debit Card' },
                { id: 'UPI' as PaymentMethod, label: 'UPI' },
                { id: 'NET_BANKING' as PaymentMethod, label: 'Net Banking' },
                { id: 'BANK_TRANSFER' as PaymentMethod, label: 'Bank Wire' },
                { id: 'CASH' as PaymentMethod, label: 'Cash' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-1 text-center font-medium rounded border transition-colors ${
                    paymentMethod === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Method Specific Interactive Section */}

          {/* 1. Credit Card & Debit Card Form */}
          {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD' || paymentMethod === 'CARD') && (
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-800">
                  {paymentMethod === 'CREDIT_CARD' ? 'Credit Card Details' : 'Debit Card Details'}
                </span>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                  {cardNetwork}
                </span>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Card Number</label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="4532 8920 1829 4812"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="Full Name as on card"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="12/28"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-slate-900" />
                    <span>Save card for auto-debit</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 2. UPI Form */}
          {paymentMethod === 'UPI' && (
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-800">Unified Payments Interface (UPI)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUpiMode('ID')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      upiMode === 'ID' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    UPI ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode('QR')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      upiMode === 'QR' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Scan QR
                  </button>
                </div>
              </div>

              {upiMode === 'ID' ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1">Virtual Payment Address (UPI ID)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="yourname@okhdfcbank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* Common UPI handle suggestions */}
                  <div className="flex items-center flex-wrap gap-1 text-[11px]">
                    <span className="text-slate-400">Quick handles:</span>
                    {['@okaxis', '@okhdfcbank', '@oksbi', '@paytm', '@ybl', '@upi'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleUpiAppendHandle(h)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 font-mono"
                      >
                        {h}
                      </button>
                    ))}
                  </div>

                  {/* Popular UPI Apps shortcuts */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1">Supported Apps:</span>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-medium text-slate-700">
                      {[
                        { id: 'gpay', name: 'Google Pay' },
                        { id: 'phonepe', name: 'PhonePe' },
                        { id: 'paytm', name: 'Paytm' },
                        { id: 'bhim', name: 'BHIM UPI' },
                        { id: 'cred', name: 'CRED' },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.id as any)}
                          className={`py-1.5 px-1 border rounded transition-colors ${
                            selectedUpiApp === app.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* QR Code view */
                <div className="text-center py-2 space-y-2">
                  <div className="inline-block p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
                    {/* Dynamic QR code representation */}
                    <div className="w-36 h-36 bg-slate-900 p-2 rounded flex flex-col justify-between items-center text-white">
                      <div className="w-full flex justify-between">
                        <div className="w-8 h-8 border-4 border-white bg-slate-900"></div>
                        <div className="w-8 h-8 border-4 border-white bg-slate-900"></div>
                      </div>
                      <div className="text-center font-mono font-bold text-[11px] tracking-widest">
                        UPI QR
                        <div className="text-[9px] text-slate-300 font-normal mt-0.5">${amount}</div>
                      </div>
                      <div className="w-full flex justify-between">
                        <div className="w-8 h-8 border-4 border-white bg-slate-900"></div>
                        <div className="w-8 h-8 bg-white"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    VPA: billing@brightloop.io · Ref: {invoice.invoice_number}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Net Banking Form */}
          {paymentMethod === 'NET_BANKING' && (
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-800">Net Banking / Direct Bank Login</span>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                >
                  <optgroup label="Popular Retail & Corporate Banks">
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="JPMorgan Chase">JPMorgan Chase</option>
                    <option value="Bank of America">Bank of America</option>
                    <option value="Wells Fargo">Wells Fargo</option>
                    <option value="Citibank">Citibank</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Corporate / Customer Account ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CUST-901928"
                  value={netBankingRef}
                  onChange={(e) => setNetBankingRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 text-blue-800 text-[11px] rounded">
                You will be redirected securely to <strong>{selectedBank}</strong> gateway to authorize this payment of ${amount}.
              </div>
            </div>
          )}

          {/* 4. Bank Wire / Transfer Form */}
          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-800">Wire / NEFT / RTGS Transfer Details</span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded font-mono text-[11px] space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Beneficiary:</span>
                  <span className="font-semibold text-slate-900">Brightloop Software Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Name:</span>
                  <span>Silicon Valley Commercial Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account #:</span>
                  <span className="font-semibold text-slate-900">8820 1928 4710 3391</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Routing / IFSC:</span>
                  <span className="font-semibold text-slate-900">BRTL0009821</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Wire UTR / Reference Transaction Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-2026-981249"
                  value={wireRef}
                  onChange={(e) => setWireRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>
          )}

          {/* 5. Cash / Cheque / Other Form */}
          {(paymentMethod === 'CASH' || paymentMethod === 'OTHER') && (
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-semibold text-slate-800">Cash / Physical Voucher / Cheque</span>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Receipt / Voucher / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991823 or Counter Voucher #881"
                  value={cashVoucher}
                  onChange={(e) => setCashVoucher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>
          )}

          {/* Notes field */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Internal Note / Remarks (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Settled for quarterly subscription renewal"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Pay ${amount} via {getMethodLabel(paymentMethod)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
