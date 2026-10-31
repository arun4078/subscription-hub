/**
 * Brightloop Customer Subscription Portal
 * Streamlined specifically for customers to view and manage active subscriptions,
 * explore all plans & brand editions (e.g. Odoo Brand), and inspect/pay/print invoices.
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './services/db';
import { Invoice, Subscription } from './types';
import { Header } from './components/Header';
import { CustomerDashboardView } from './components/CustomerDashboardView';
import { CustomerExplorePlans } from './components/CustomerExplorePlans';
import { CustomerInvoicesView } from './components/CustomerInvoicesView';
import { FinanceAnalyticsView } from './components/FinanceAnalyticsView';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { RotateCcw } from 'lucide-react';

function CustomerApp() {
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleResetData = () => {
    if (confirm('Reset database to clean initial state?')) {
      db.resetToDefaults();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Full-Width Content Container (Without Left Sidebar) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <CustomerDashboardView
            key={refreshKey}
            onNavigateToExplore={() => setActiveView('explore')}
            onNavigateToInvoices={() => setActiveView('invoices')}
            onOpenPrintModal={(inv) => setPrintInvoice(inv)}
            onOpenPaymentModal={(inv) => setPayInvoice(inv)}
          />
        )}

        {activeView === 'explore' && (
          <CustomerExplorePlans
            key={refreshKey}
            onSubscriptionCreated={(newSub) => {
              setRefreshKey((k) => k + 1);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'invoices' && (
          <CustomerInvoicesView
            key={refreshKey}
            onOpenPrintModal={(inv) => setPrintInvoice(inv)}
            onOpenPaymentModal={(inv) => setPayInvoice(inv)}
          />
        )}

        {activeView === 'analytics' && <FinanceAnalyticsView key={refreshKey} />}
      </main>

      {/* Floating Demo Reset Button (Bottom-Right) */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={handleResetData}
          title="Reset database to initial demo state"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 text-xs font-medium border border-slate-300 rounded-full shadow-md backdrop-blur-xs transition-all hover:shadow-lg"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Print Friendly Invoice Modal */}
      <PrintInvoiceModal
        invoice={printInvoice}
        onClose={() => setPrintInvoice(null)}
      />

      {/* Record Payment Modal */}
      <PaymentModal
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onPaymentSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Auth Modal (Customer Registration & Account Switch) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode="SIGNUP"
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CustomerApp />
    </AuthProvider>
  );
}
