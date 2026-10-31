import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, Shield, Lock, Mail, Building, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP' | 'FORGOT';
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
}: AuthModalProps) {
  if (!isOpen) return null;

  const { login, signup, requestPasswordReset, validatePassword } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  // Live password validation
  const passValidation = validatePassword(password);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(email, password);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Login failed.');
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = signup({
      name,
      email,
      password,
      company_name: companyName,
      phone,
    });
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Signup failed.');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = requestPasswordReset(email);
    if (res.success && res.resetLink) {
      setResetLink(res.resetLink);
    } else {
      setError(res.error || 'Password reset failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'LOGIN' && 'Sign In to Brightloop'}
              {mode === 'SIGNUP' && 'Create Customer Account'}
              {mode === 'FORGOT' && 'Forgot Password'}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'LOGIN' && 'Access customer portal or staff console'}
              {mode === 'SIGNUP' && 'Sign up to purchase and manage subscriptions'}
              {mode === 'FORGOT' && 'Enter email to receive your password reset token'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brightloop.io"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('FORGOT');
                    setError(null);
                  }}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded transition-colors text-xs"
            >
              Log In
            </button>

            <div className="text-center pt-2 text-[11px] text-slate-500 border-t border-slate-100">
              New customer?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setError(null);
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Create an account
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'SIGNUP' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Connor"
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
                placeholder="Cyberdyne Systems"
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
                placeholder="sarah@cyberdyne.com"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
              />

              {/* Password Rule Checklist from Specification */}
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1 text-[11px]">
                <div className="font-semibold text-slate-700">Strict Password Rules:</div>
                <div
                  className={`flex items-center gap-1.5 ${
                    password.length > 8 ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <span className="font-mono text-xs">{password.length > 8 ? '✓' : '○'}</span>
                  <span>More than 8 characters</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[A-Z]/.test(password) ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <span className="font-mono text-xs">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[a-z]/.test(password) ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <span className="font-mono text-xs">{/[a-z]/.test(password) ? '✓' : '○'}</span>
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[!@#$%^&*(),.?":{}|<>]/.test(password)
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="font-mono text-xs">
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'}
                  </span>
                  <span>At least one special character (!@#$%...)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!passValidation.valid}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded transition-colors text-xs disabled:opacity-50"
            >
              Complete Registration
            </button>

            <div className="text-center pt-2 text-[11px] text-slate-500 border-t border-slate-100">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Log in
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'FORGOT' && (
          <div className="space-y-3 text-xs">
            {resetLink ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 space-y-1">
                  <div className="font-semibold">Mock Reset Link Generated!</div>
                  <p className="text-[11px]">
                    Per specification, password reset email is mocked. You can use the link below:
                  </p>
                  <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-[10px] break-all select-all text-slate-900 mt-2">
                    {resetLink}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMode('LOGIN');
                    setResetLink(null);
                  }}
                  className="w-full py-2 bg-slate-900 text-white font-semibold rounded text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@acmecorp.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs"
                >
                  Generate Password Reset Link
                </button>

                <div className="text-center pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      setError(null);
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Back to Log in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
