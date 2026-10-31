import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronDown } from 'lucide-react';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenAuthModal: () => void;
}

export function Header({
  activeView,
  setActiveView,
  onOpenAuthModal,
}: HeaderProps) {
  const { currentUser, allUsers, switchUser } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const customerAccounts = allUsers.filter((u) => u.role === 'CUSTOMER');

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-xs">
                B
              </div>
              <span>Brightloop Subscriptions</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeView === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              My Subscriptions
            </button>
            <button
              onClick={() => setActiveView('explore')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeView === 'explore'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Plans &amp; Brand Editions
            </button>
            <button
              onClick={() => setActiveView('invoices')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeView === 'invoices'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Invoices &amp; Receipts
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeView === 'analytics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Finance Analytics
            </button>
          </nav>

          {/* Customer Account Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors shadow-xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-[160px]">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Active Customer Account</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    {currentUser.company_name && (
                      <p className="text-[11px] font-medium text-slate-700">{currentUser.company_name}</p>
                    )}
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Demo Customer
                    </div>
                    {customerAccounts.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          switchUser(cust.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors flex flex-col ${
                          currentUser.id === cust.id
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cust.name}</span>
                        <span className="text-[11px] text-slate-500">{cust.company_name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenAuthModal();
                      }}
                      className="w-full text-center py-1.5 text-xs text-blue-600 hover:bg-blue-50 font-medium rounded"
                    >
                      Sign Up New Customer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
