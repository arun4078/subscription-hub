/**
 * In-Memory & LocalStorage Persisted Relational Store
 * Provides full CRUD operations, batch billing execution, and Supabase synchronization.
 */

import {
  advanceBillingDate,
  calculateDueDate,
  calculateSubscriptionBilling,
  getTodayIso,
  isInvoiceOverdue,
  normalizeToMrr,
  toCents,
  toMoney,
} from './billing';
import {
  BillingPeriod,
  DashboardStats,
  DiscountRule,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  Plan,
  Product,
  QuotationTemplate,
  Role,
  Subscription,
  SubscriptionStatus,
  TaxRule,
  User,
} from '../types';

const STORAGE_PREFIX = 'brightloop_sms_v1_';

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed to read from localStorage: ${key}`, err);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write to localStorage: ${key}`, err);
  }
}

// -------------------------------------------------------------
// Initial Mock Seed Data
// -------------------------------------------------------------
const today = getTodayIso();
const pastDate15 = new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0];
const pastDate30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const futureDate15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
const futureDate30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'Alexander Sterling',
    email: 'admin@brightloop.io',
    role: 'ADMIN',
    company_name: 'Brightloop Core Operations',
    phone: '+1 555-0100',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'user-staff-1',
    name: 'Elena Rostova',
    email: 'finance@brightloop.io',
    role: 'STAFF',
    company_name: 'Brightloop Finance & Billing',
    phone: '+1 555-0101',
    created_at: '2026-01-05T09:30:00Z',
  },
  {
    id: 'user-staff-2',
    name: 'Marcus Vance',
    email: 'sales@brightloop.io',
    role: 'STAFF',
    company_name: 'Brightloop Enterprise Sales',
    phone: '+1 555-0102',
    created_at: '2026-01-10T11:00:00Z',
  },
  {
    id: 'user-cust-1',
    name: 'Samantha Reed',
    email: 'contact@acmecorp.com',
    role: 'CUSTOMER',
    company_name: 'Acme Industrial Corp',
    phone: '+1 555-0201',
    created_at: '2026-02-01T14:00:00Z',
  },
  {
    id: 'user-cust-2',
    name: 'David Chen',
    email: 'buyer@novatech.io',
    role: 'CUSTOMER',
    company_name: 'NovaTech Solutions',
    phone: '+1 555-0202',
    created_at: '2026-02-15T16:20:00Z',
  },
  {
    id: 'user-cust-3',
    name: 'Rachel Adams',
    email: 'hello@retailhub.net',
    role: 'CUSTOMER',
    company_name: 'RetailHub Commerce',
    phone: '+1 555-0203',
    created_at: '2026-03-01T10:15:00Z',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Brightloop ERP Core Suite',
    type: 'SOFTWARE_LICENSE',
    sales_price: '2400.00',
    cost_price: '900.00',
    notes: 'Primary enterprise software platform with automated ledger sync.',
    variants: [
      { id: 'var-1', name: 'Standard SaaS Edition', extra_price: '0.00' },
      { id: 'var-2', name: 'Odoo Compatible Brand Edition', extra_price: '560.00' }, // Mentioned in PDF!
      { id: 'var-3', name: 'Dedicated Multi-Tenant Cloud', extra_price: '1100.00' },
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'AI Revenue & Billing Insights Add-on',
    type: 'ADDON',
    sales_price: '650.00',
    cost_price: '180.00',
    notes: 'Predictive churn alerts and automatic payment matching engine.',
    variants: [
      { id: 'var-4', name: 'Single Workspace Seat', extra_price: '0.00' },
      { id: 'var-5', name: 'Enterprise Unlimited Seats', extra_price: '450.00' },
    ],
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'prod-3',
    name: '24/7 SLA Priority Technical Support',
    type: 'SERVICE',
    sales_price: '850.00',
    cost_price: '300.00',
    notes: 'Guaranteed 15-minute response time and designated solutions architect.',
    variants: [],
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'prod-4',
    name: 'Rugged Warehouse Terminal Scanner',
    type: 'HARDWARE',
    sales_price: '480.00',
    cost_price: '240.00',
    notes: 'Direct QR / Barcode inventory sync with Brightloop API.',
    variants: [
      { id: 'var-6', name: 'Standard WiFi Unit', extra_price: '0.00' },
      { id: 'var-7', name: '5G LTE Cellular Enabled', extra_price: '120.00' },
    ],
    created_at: '2026-01-04T00:00:00Z',
  },
];

const INITIAL_PLANS: Plan[] = [
  {
    id: 'plan-monthly-core',
    name: 'Enterprise Scale Monthly',
    price: '2400.00',
    billing_period: 'MONTHLY',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2028-12-31',
    auto_close: false,
    closable: true,
    pausable: true,
    renewable: true,
    description: 'Billed monthly. Includes full core modules and self-service portal.',
  },
  {
    id: 'plan-yearly-corp',
    name: 'Corporate Annual Contract',
    price: '24000.00',
    billing_period: 'YEARLY',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2029-12-31',
    auto_close: false,
    closable: false,
    pausable: false,
    renewable: true,
    description: 'Annual prepaid contract with locked terms and priority deployment.',
  },
  {
    id: 'plan-weekly-sprint',
    name: 'Weekly Evaluation Sprint',
    price: '600.00',
    billing_period: 'WEEKLY',
    min_quantity: 2,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    auto_close: true,
    closable: true,
    pausable: false,
    renewable: false,
    description: 'Auto-closes at term expiry. Ideal for pilot programs and migrations.',
  },
  {
    id: 'plan-daily-compute',
    name: 'Daily Elastic Compute License',
    price: '150.00',
    billing_period: 'DAILY',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    auto_close: true,
    closable: true,
    pausable: true,
    renewable: false,
    description: 'High-frequency billing for transient workloads.',
  },
];

const INITIAL_TAXES: TaxRule[] = [
  { id: 'tax-1', name: 'GST Standard (18%)', rate: '18.00', is_active: true },
  { id: 'tax-2', name: 'VAT Standard (10%)', rate: '10.00', is_active: true },
  { id: 'tax-3', name: 'State Tech Tax (5%)', rate: '5.00', is_active: true },
  { id: 'tax-4', name: 'Zero-Rated / Tax Exempt', rate: '0.00', is_active: true },
];

const INITIAL_DISCOUNTS: DiscountRule[] = [
  {
    id: 'disc-1',
    code: 'ODOO560',
    name: 'Odoo Migration Rebate',
    discount_type: 'FIXED',
    value: '560.00',
    min_purchase: '2000.00',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 100,
    times_used: 14,
    applies_to: 'WHOLE_SUBSCRIPTION',
  },
  {
    id: 'disc-2',
    code: 'GROWTH15',
    name: '15% Volume Growth Incentive',
    discount_type: 'PERCENTAGE',
    value: '15.00',
    min_purchase: '2500.00',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 250,
    times_used: 32,
    applies_to: 'WHOLE_SUBSCRIPTION',
  },
  {
    id: 'disc-3',
    code: 'WELCOME10',
    name: 'First Month 10% Off',
    discount_type: 'PERCENTAGE',
    value: '10.00',
    min_purchase: '1000.00',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 50,
    times_used: 48, // Almost maxed!
    applies_to: 'WHOLE_SUBSCRIPTION',
  },
];

const INITIAL_TEMPLATES: QuotationTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Turnkey Enterprise with Odoo Edition & SLA',
    plan_id: 'plan-monthly-core',
    valid_days: 30,
    notes: 'Default proposal package for mid-market migrations.',
    lines: [
      {
        product_id: 'prod-1',
        variant_id: 'var-2', // Odoo brand variant (+560.00)
        quantity: 1,
        unit_price: '2960.00', // 2400 + 560
        tax_id: 'tax-1',
      },
      {
        product_id: 'prod-3',
        quantity: 1,
        unit_price: '850.00',
        tax_id: 'tax-1',
      },
    ],
  },
  {
    id: 'tmpl-2',
    name: 'Annual Scale Package with AI Intelligence',
    plan_id: 'plan-yearly-corp',
    valid_days: 45,
    notes: 'Full corporate subscription with 12 months commitment.',
    lines: [
      {
        product_id: 'prod-1',
        variant_id: 'var-1',
        quantity: 1,
        unit_price: '24000.00',
        tax_id: 'tax-1',
      },
      {
        product_id: 'prod-2',
        variant_id: 'var-5',
        quantity: 2,
        unit_price: '1100.00',
        tax_id: 'tax-1',
      },
    ],
  },
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    subscription_number: 'SUB-2026-001',
    customer_id: 'user-cust-1',
    customer_name: 'Samantha Reed (Acme Industrial)',
    customer_email: 'contact@acmecorp.com',
    plan_id: 'plan-monthly-core',
    plan_name: 'Enterprise Scale Monthly',
    billing_period: 'MONTHLY',
    status: 'ACTIVE',
    start_date: pastDate30,
    expiry_date: '2027-02-01',
    next_billing_date: today, // DUE TODAY! Clicking "Run Billing" will invoice this!
    payment_terms: 'Net 15',
    discount_code: 'ODOO560',
    auto_close: false,
    closable: true,
    created_at: pastDate30 + 'T10:00:00Z',
    lines: [
      {
        id: 'sub-line-1',
        product_id: 'prod-1',
        product_name: 'Brightloop ERP Core Suite',
        variant_id: 'var-2',
        variant_name: 'Odoo Compatible Brand Edition (+560.00)',
        quantity: 1,
        unit_price: '2960.00', // 2400 + 560
        tax_id: 'tax-1',
        tax_rate: '18.00',
      },
      {
        id: 'sub-line-2',
        product_id: 'prod-3',
        product_name: '24/7 SLA Priority Technical Support',
        quantity: 1,
        unit_price: '850.00',
        tax_id: 'tax-1',
        tax_rate: '18.00',
      },
    ],
  },
  {
    id: 'sub-2',
    subscription_number: 'SUB-2026-002',
    customer_id: 'user-cust-2',
    customer_name: 'David Chen (NovaTech Solutions)',
    customer_email: 'buyer@novatech.io',
    plan_id: 'plan-yearly-corp',
    plan_name: 'Corporate Annual Contract',
    billing_period: 'YEARLY',
    status: 'ACTIVE',
    start_date: pastDate30,
    expiry_date: '2027-01-30',
    next_billing_date: futureDate30, // In future
    payment_terms: 'Net 30',
    discount_code: 'GROWTH15',
    auto_close: false,
    closable: false,
    created_at: pastDate30 + 'T14:30:00Z',
    lines: [
      {
        id: 'sub-line-3',
        product_id: 'prod-1',
        product_name: 'Brightloop ERP Core Suite',
        variant_id: 'var-3',
        variant_name: 'Dedicated Multi-Tenant Cloud (+1100.00)',
        quantity: 1,
        unit_price: '25100.00',
        tax_id: 'tax-1',
        tax_rate: '18.00',
      },
    ],
  },
  {
    id: 'sub-3',
    subscription_number: 'SUB-2026-003',
    customer_id: 'user-cust-3',
    customer_name: 'Rachel Adams (RetailHub Commerce)',
    customer_email: 'hello@retailhub.net',
    plan_id: 'plan-weekly-sprint',
    plan_name: 'Weekly Evaluation Sprint',
    billing_period: 'WEEKLY',
    status: 'QUOTATION',
    start_date: today,
    expiry_date: futureDate15,
    next_billing_date: today,
    payment_terms: 'Immediate',
    discount_code: '',
    auto_close: true,
    closable: true,
    created_at: today + 'T08:15:00Z',
    lines: [
      {
        id: 'sub-line-4',
        product_id: 'prod-1',
        product_name: 'Brightloop ERP Core Suite',
        variant_id: 'var-1',
        variant_name: 'Standard SaaS Edition',
        quantity: 2,
        unit_price: '600.00',
        tax_id: 'tax-2',
        tax_rate: '10.00',
      },
    ],
  },
  {
    id: 'sub-4',
    subscription_number: 'SUB-2026-004',
    customer_id: 'user-cust-1',
    customer_name: 'Samantha Reed (Acme Industrial)',
    customer_email: 'contact@acmecorp.com',
    plan_id: 'plan-daily-compute',
    plan_name: 'Daily Elastic Compute License',
    billing_period: 'DAILY',
    status: 'DRAFT',
    start_date: today,
    expiry_date: futureDate15,
    next_billing_date: today,
    payment_terms: 'Net 15',
    discount_code: '',
    auto_close: true,
    closable: true,
    created_at: today + 'T09:00:00Z',
    lines: [
      {
        id: 'sub-line-5',
        product_id: 'prod-4',
        product_name: 'Rugged Warehouse Terminal Scanner',
        variant_id: 'var-7',
        variant_name: '5G LTE Cellular Enabled (+120.00)',
        quantity: 3,
        unit_price: '270.00',
        tax_id: 'tax-1',
        tax_rate: '18.00',
      },
    ],
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoice_number: 'INV-2026-001',
    subscription_id: 'sub-1',
    subscription_number: 'SUB-2026-001',
    customer_id: 'user-cust-1',
    customer_name: 'Samantha Reed (Acme Industrial)',
    customer_email: 'contact@acmecorp.com',
    status: 'CONFIRMED',
    issue_date: pastDate30,
    due_date: pastDate15, // Past due date! This is computed as OVERDUE!
    billing_period_start: pastDate30,
    billing_period_end: today,
    subtotal: '3810.00',
    discount_amount: '560.00',
    tax_amount: '585.00',
    total_amount: '3835.00',
    paid_amount: '0.00',
    balance_amount: '3835.00', // Unpaid!
    created_at: pastDate30 + 'T10:05:00Z',
    lines: [
      {
        id: 'inv-line-1',
        product_name: 'Brightloop ERP Core Suite',
        variant_name: 'Odoo Compatible Brand Edition (+560.00)',
        quantity: 1,
        unit_price: '2960.00',
        subtotal: '2960.00',
        discount_amount: '435.49',
        tax_rate: '18.00',
        tax_amount: '454.41',
        total: '2978.92',
      },
      {
        id: 'inv-line-2',
        product_name: '24/7 SLA Priority Technical Support',
        quantity: 1,
        unit_price: '850.00',
        subtotal: '850.00',
        discount_amount: '124.51',
        tax_rate: '18.00',
        tax_amount: '130.59',
        total: '856.08',
      },
    ],
  },
  {
    id: 'inv-2',
    invoice_number: 'INV-2026-002',
    subscription_id: 'sub-2',
    subscription_number: 'SUB-2026-002',
    customer_id: 'user-cust-2',
    customer_name: 'David Chen (NovaTech Solutions)',
    customer_email: 'buyer@novatech.io',
    status: 'PAID',
    issue_date: pastDate30,
    due_date: today,
    billing_period_start: pastDate30,
    billing_period_end: futureDate30,
    subtotal: '25100.00',
    discount_amount: '3765.00',
    tax_amount: '3840.30',
    total_amount: '25175.30',
    paid_amount: '25175.30',
    balance_amount: '0.00',
    created_at: pastDate30 + 'T14:40:00Z',
    lines: [
      {
        id: 'inv-line-3',
        product_name: 'Brightloop ERP Core Suite',
        variant_name: 'Dedicated Multi-Tenant Cloud (+1100.00)',
        quantity: 1,
        unit_price: '25100.00',
        subtotal: '25100.00',
        discount_amount: '3765.00',
        tax_rate: '18.00',
        tax_amount: '3840.30',
        total: '25175.30',
      },
    ],
  },
  {
    id: 'inv-3',
    invoice_number: 'INV-2026-003',
    subscription_id: 'sub-1',
    subscription_number: 'SUB-2026-001',
    customer_id: 'user-cust-1',
    customer_name: 'Samantha Reed (Acme Industrial)',
    customer_email: 'contact@acmecorp.com',
    status: 'CONFIRMED',
    issue_date: pastDate15,
    due_date: futureDate15, // Not overdue yet
    billing_period_start: pastDate15,
    billing_period_end: futureDate15,
    subtotal: '1200.00',
    discount_amount: '0.00',
    tax_amount: '216.00',
    total_amount: '1416.00',
    paid_amount: '600.00', // Partial payment
    balance_amount: '816.00',
    created_at: pastDate15 + 'T09:20:00Z',
    lines: [
      {
        id: 'inv-line-4',
        product_name: 'Brightloop ERP Core Suite',
        variant_name: 'Standard SaaS Edition',
        quantity: 1,
        unit_price: '1200.00',
        subtotal: '1200.00',
        discount_amount: '0.00',
        tax_rate: '18.00',
        tax_amount: '216.00',
        total: '1416.00',
      },
    ],
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    invoice_id: 'inv-2',
    invoice_number: 'INV-2026-002',
    customer_id: 'user-cust-2',
    customer_name: 'David Chen (NovaTech Solutions)',
    amount: '25175.30',
    payment_method: 'BANK_TRANSFER',
    payment_date: pastDate15,
    note: 'Wire transfer ref #WIRE-2026-NT89',
    created_at: pastDate15 + 'T16:00:00Z',
  },
  {
    id: 'pay-2',
    invoice_id: 'inv-3',
    invoice_number: 'INV-2026-003',
    customer_id: 'user-cust-1',
    customer_name: 'Samantha Reed (Acme Industrial)',
    amount: '600.00',
    payment_method: 'CARD',
    payment_date: pastDate15,
    note: 'Partial deposit via Corporate Visa',
    created_at: pastDate15 + 'T11:00:00Z',
  },
];

// -------------------------------------------------------------
// Database Repository Class
// -------------------------------------------------------------
class DatabaseStore {
  private users: User[] = [];
  private products: Product[] = [];
  private plans: Plan[] = [];
  private taxes: TaxRule[] = [];
  private discounts: DiscountRule[] = [];
  private templates: QuotationTemplate[] = [];
  private subscriptions: Subscription[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];

  constructor() {
    this.reload();
  }

  public reload() {
    this.users = loadStorage('users', INITIAL_USERS);
    this.products = loadStorage('products', INITIAL_PRODUCTS);
    this.plans = loadStorage('plans', INITIAL_PLANS);
    this.taxes = loadStorage('taxes', INITIAL_TAXES);
    this.discounts = loadStorage('discounts', INITIAL_DISCOUNTS);
    this.templates = loadStorage('templates', INITIAL_TEMPLATES);
    this.subscriptions = loadStorage('subscriptions', INITIAL_SUBSCRIPTIONS);
    this.invoices = loadStorage('invoices', INITIAL_INVOICES);
    this.payments = loadStorage('payments', INITIAL_PAYMENTS);
  }

  public resetToDefaults() {
    this.users = [...INITIAL_USERS];
    this.products = [...INITIAL_PRODUCTS];
    this.plans = [...INITIAL_PLANS];
    this.taxes = [...INITIAL_TAXES];
    this.discounts = [...INITIAL_DISCOUNTS];
    this.templates = [...INITIAL_TEMPLATES];
    this.subscriptions = [...INITIAL_SUBSCRIPTIONS];
    this.invoices = [...INITIAL_INVOICES];
    this.payments = [...INITIAL_PAYMENTS];
    this.persistAll();
  }

  private persistAll() {
    saveStorage('users', this.users);
    saveStorage('products', this.products);
    saveStorage('plans', this.plans);
    saveStorage('taxes', this.taxes);
    saveStorage('discounts', this.discounts);
    saveStorage('templates', this.templates);
    saveStorage('subscriptions', this.subscriptions);
    saveStorage('invoices', this.invoices);
    saveStorage('payments', this.payments);
  }

  // --- Users / Auth ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public addUser(user: Omit<User, 'id' | 'created_at'>): User {
    const existing = this.getUserByEmail(user.email);
    if (existing) {
      throw new Error(`Email ${user.email} is already registered.`);
    }
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.users.push(newUser);
    saveStorage('users', this.users);
    return newUser;
  }

  // --- Products ---
  public getProducts(): Product[] {
    return [...this.products];
  }

  public saveProduct(product: Partial<Product> & { name: string; sales_price: string; cost_price: string }): Product {
    if (product.id) {
      const idx = this.products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        this.products[idx] = {
          ...this.products[idx],
          ...product,
        };
        saveStorage('products', this.products);
        return this.products[idx];
      }
    }
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: product.name,
      type: product.type || 'SOFTWARE_LICENSE',
      sales_price: product.sales_price,
      cost_price: product.cost_price,
      notes: product.notes || '',
      variants: product.variants || [],
      created_at: new Date().toISOString(),
    };
    this.products.unshift(newProd);
    saveStorage('products', this.products);
    return newProd;
  }

  public deleteProduct(id: string): boolean {
    this.products = this.products.filter((p) => p.id !== id);
    saveStorage('products', this.products);
    return true;
  }

  // --- Plans ---
  public getPlans(): Plan[] {
    return [...this.plans];
  }

  public savePlan(plan: Partial<Plan> & { name: string; price: string; billing_period: BillingPeriod }): Plan {
    if (plan.id) {
      const idx = this.plans.findIndex((p) => p.id === plan.id);
      if (idx !== -1) {
        this.plans[idx] = {
          ...this.plans[idx],
          ...plan,
        };
        saveStorage('plans', this.plans);
        return this.plans[idx];
      }
    }
    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      name: plan.name,
      price: plan.price,
      billing_period: plan.billing_period,
      min_quantity: plan.min_quantity || 1,
      start_date: plan.start_date || getTodayIso(),
      end_date: plan.end_date || '2028-12-31',
      auto_close: Boolean(plan.auto_close),
      closable: plan.closable ?? true,
      pausable: Boolean(plan.pausable),
      renewable: plan.renewable ?? true,
      description: plan.description || '',
    };
    this.plans.unshift(newPlan);
    saveStorage('plans', this.plans);
    return newPlan;
  }

  public deletePlan(id: string): boolean {
    this.plans = this.plans.filter((p) => p.id !== id);
    saveStorage('plans', this.plans);
    return true;
  }

  // --- Taxes ---
  public getTaxes(): TaxRule[] {
    return [...this.taxes];
  }

  public saveTax(tax: Partial<TaxRule> & { name: string; rate: string }): TaxRule {
    if (tax.id) {
      const idx = this.taxes.findIndex((t) => t.id === tax.id);
      if (idx !== -1) {
        this.taxes[idx] = { ...this.taxes[idx], ...tax };
        saveStorage('taxes', this.taxes);
        return this.taxes[idx];
      }
    }
    const newTax: TaxRule = {
      id: `tax-${Date.now()}`,
      name: tax.name,
      rate: tax.rate,
      is_active: tax.is_active ?? true,
    };
    this.taxes.push(newTax);
    saveStorage('taxes', this.taxes);
    return newTax;
  }

  public deleteTax(id: string): boolean {
    this.taxes = this.taxes.filter((t) => t.id !== id);
    saveStorage('taxes', this.taxes);
    return true;
  }

  // --- Discounts ---
  public getDiscounts(): DiscountRule[] {
    return [...this.discounts];
  }

  public saveDiscount(disc: Partial<DiscountRule> & { code: string; name: string; value: string }): DiscountRule {
    if (disc.id) {
      const idx = this.discounts.findIndex((d) => d.id === disc.id);
      if (idx !== -1) {
        this.discounts[idx] = { ...this.discounts[idx], ...disc };
        saveStorage('discounts', this.discounts);
        return this.discounts[idx];
      }
    }
    const newDisc: DiscountRule = {
      id: `disc-${Date.now()}`,
      code: disc.code.toUpperCase().trim(),
      name: disc.name,
      discount_type: disc.discount_type || 'PERCENTAGE',
      value: disc.value,
      min_purchase: disc.min_purchase,
      min_quantity: disc.min_quantity,
      start_date: disc.start_date || getTodayIso(),
      end_date: disc.end_date || '2027-12-31',
      max_uses: disc.max_uses ?? 100,
      times_used: disc.times_used ?? 0,
      applies_to: disc.applies_to || 'WHOLE_SUBSCRIPTION',
      product_id: disc.product_id,
    };
    this.discounts.push(newDisc);
    saveStorage('discounts', this.discounts);
    return newDisc;
  }

  public deleteDiscount(id: string): boolean {
    this.discounts = this.discounts.filter((d) => d.id !== id);
    saveStorage('discounts', this.discounts);
    return true;
  }

  // --- Quotation Templates ---
  public getTemplates(): QuotationTemplate[] {
    return [...this.templates];
  }

  public saveTemplate(tmpl: Partial<QuotationTemplate> & { name: string; plan_id: string }): QuotationTemplate {
    if (tmpl.id) {
      const idx = this.templates.findIndex((t) => t.id === tmpl.id);
      if (idx !== -1) {
        this.templates[idx] = { ...this.templates[idx], ...tmpl };
        saveStorage('templates', this.templates);
        return this.templates[idx];
      }
    }
    const newTmpl: QuotationTemplate = {
      id: `tmpl-${Date.now()}`,
      name: tmpl.name,
      plan_id: tmpl.plan_id,
      valid_days: tmpl.valid_days || 30,
      lines: tmpl.lines || [],
      notes: tmpl.notes || '',
    };
    this.templates.push(newTmpl);
    saveStorage('templates', this.templates);
    return newTmpl;
  }

  public deleteTemplate(id: string): boolean {
    this.templates = this.templates.filter((t) => t.id !== id);
    saveStorage('templates', this.templates);
    return true;
  }

  // --- Subscriptions ---
  public getSubscriptions(customerId?: string): Subscription[] {
    if (customerId) {
      return this.subscriptions.filter((s) => s.customer_id === customerId);
    }
    return [...this.subscriptions];
  }

  public getSubscriptionById(id: string): Subscription | undefined {
    return this.subscriptions.find((s) => s.id === id);
  }

  public saveSubscription(sub: Partial<Subscription>): Subscription {
    if (sub.id) {
      const idx = this.subscriptions.findIndex((s) => s.id === sub.id);
      if (idx !== -1) {
        this.subscriptions[idx] = {
          ...this.subscriptions[idx],
          ...sub,
        };
        saveStorage('subscriptions', this.subscriptions);
        return this.subscriptions[idx];
      }
    }

    const subNumber = `SUB-${new Date().getFullYear()}-${String(
      this.subscriptions.length + 1
    ).padStart(3, '0')}`;

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      subscription_number: sub.subscription_number || subNumber,
      customer_id: sub.customer_id || '',
      customer_name: sub.customer_name || 'Customer',
      customer_email: sub.customer_email || '',
      plan_id: sub.plan_id || '',
      plan_name: sub.plan_name || 'Subscription Plan',
      billing_period: sub.billing_period || 'MONTHLY',
      status: sub.status || 'DRAFT',
      start_date: sub.start_date || getTodayIso(),
      expiry_date: sub.expiry_date || '2027-12-31',
      next_billing_date: sub.next_billing_date || getTodayIso(),
      payment_terms: sub.payment_terms || 'Net 15',
      lines: sub.lines || [],
      discount_code: sub.discount_code,
      auto_close: Boolean(sub.auto_close),
      closable: sub.closable ?? true,
      created_at: new Date().toISOString(),
    };
    this.subscriptions.unshift(newSub);
    saveStorage('subscriptions', this.subscriptions);
    return newSub;
  }

  public updateSubscriptionStatus(id: string, newStatus: SubscriptionStatus): Subscription {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error('Subscription not found');
    sub.status = newStatus;
    if (newStatus === 'PAUSED') {
      sub.paused_at = new Date().toISOString();
    } else if (newStatus === 'ACTIVE' && sub.paused_at) {
      delete sub.paused_at;
      delete sub.pause_reason;
    }
    saveStorage('subscriptions', this.subscriptions);
    return sub;
  }

  public pauseSubscription(id: string, reason: string = 'Customer requested pause'): Subscription {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error('Subscription not found');
    sub.status = 'PAUSED';
    sub.paused_at = new Date().toISOString();
    sub.pause_reason = reason;
    saveStorage('subscriptions', this.subscriptions);
    return sub;
  }

  public resumeSubscription(id: string): Subscription {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error('Subscription not found');
    sub.status = 'ACTIVE';
    delete sub.paused_at;
    delete sub.pause_reason;
    saveStorage('subscriptions', this.subscriptions);
    return sub;
  }

  // --- Invoices ---
  public getInvoices(customerId?: string): Invoice[] {
    if (customerId) {
      return this.invoices.filter((inv) => inv.customer_id === customerId);
    }
    return [...this.invoices];
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((inv) => inv.id === id);
  }

  public saveInvoice(invoice: Invoice): Invoice {
    const idx = this.invoices.findIndex((inv) => inv.id === invoice.id);
    if (idx !== -1) {
      this.invoices[idx] = invoice;
    } else {
      this.invoices.unshift(invoice);
    }
    saveStorage('invoices', this.invoices);
    return invoice;
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): Invoice {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    if (inv.status === 'PAID' && status === 'CANCELLED') {
      throw new Error('Paid invoices cannot be cancelled.');
    }
    inv.status = status;
    saveStorage('invoices', this.invoices);
    return inv;
  }

  // --- Payments ---
  public getPayments(customerId?: string): Payment[] {
    if (customerId) {
      return this.payments.filter((p) => p.customer_id === customerId);
    }
    return [...this.payments];
  }

  public recordPayment(params: {
    invoice_id: string;
    amount: string;
    payment_method: PaymentMethod;
    payment_date: string;
    note?: string;
  }): { payment: Payment; invoice: Invoice } {
    const invoice = this.invoices.find((i) => i.id === params.invoice_id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') {
      throw new Error('This invoice is already fully paid.');
    }
    if (invoice.status === 'CANCELLED') {
      throw new Error('Cannot record payment for a cancelled invoice.');
    }

    const payCents = toCents(params.amount);
    if (payCents <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const currentPaidCents = toCents(invoice.paid_amount);
    const totalCents = toCents(invoice.total_amount);
    const newPaidCents = currentPaidCents + payCents;
    const newBalanceCents = Math.max(0, totalCents - newPaidCents);

    invoice.paid_amount = toMoney(newPaidCents);
    invoice.balance_amount = toMoney(newBalanceCents);

    if (newBalanceCents <= 0) {
      invoice.status = 'PAID';
    } else if (invoice.status === 'DRAFT') {
      invoice.status = 'CONFIRMED';
    }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      amount: toMoney(payCents),
      payment_method: params.payment_method,
      payment_date: params.payment_date || getTodayIso(),
      note: params.note || '',
      created_at: new Date().toISOString(),
    };

    this.payments.unshift(payment);
    saveStorage('payments', this.payments);
    saveStorage('invoices', this.invoices);

    return { payment, invoice };
  }

  // -------------------------------------------------------------
  // Central Billing Engine ("Run Billing" Button)
  // -------------------------------------------------------------
  public runBilling(referenceDate: string = getTodayIso()): {
    invoicesCreated: Invoice[];
    subscriptionsProcessed: number;
    skippedDuplicates: number;
    closedSubscriptions: number;
  } {
    const created: Invoice[] = [];
    let skipped = 0;
    let closed = 0;
    let processed = 0;

    // RULE 1: Which subscriptions: status is ACTIVE and next billing date is today or earlier.
    const activeSubs = this.subscriptions.filter(
      (sub) => sub.status === 'ACTIVE' && sub.next_billing_date <= referenceDate
    );

    for (const sub of activeSubs) {
      processed++;

      // Check auto-close rule if expired
      if (sub.auto_close && sub.expiry_date && sub.expiry_date < referenceDate) {
        sub.status = 'CLOSED';
        closed++;
        continue;
      }

      const periodStart = sub.next_billing_date;

      // RULE 6: No double billing: a unique rule on subscription and billing period start means running billing twice creates nothing new.
      const alreadyBilled = this.invoices.some(
        (inv) =>
          inv.subscription_id === sub.id &&
          inv.billing_period_start === periodStart &&
          inv.status !== 'CANCELLED'
      );

      if (alreadyBilled) {
        skipped++;
        continue;
      }

      // Compute calculations with discounts and taxes
      const billResult = calculateSubscriptionBilling(
        sub,
        this.taxes,
        this.discounts,
        periodStart
      );

      // Increment discount usage if applied
      if (billResult.applied_discount) {
        const disc = this.discounts.find(
          (d) => d.id === billResult.applied_discount!.id
        );
        if (disc) {
          disc.times_used += 1;
        }
      }

      const nextPeriodDate = advanceBillingDate(periodStart, sub.billing_period);
      const dueDate = calculateDueDate(periodStart, sub.payment_terms);

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(
        this.invoices.length + created.length + 1
      ).padStart(3, '0')}`;

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}-${sub.id}`,
        invoice_number: invoiceNumber,
        subscription_id: sub.id,
        subscription_number: sub.subscription_number,
        customer_id: sub.customer_id,
        customer_name: sub.customer_name,
        customer_email: sub.customer_email,
        status: 'CONFIRMED',
        issue_date: periodStart,
        due_date: dueDate,
        billing_period_start: periodStart,
        billing_period_end: nextPeriodDate,
        lines: billResult.lines,
        subtotal: billResult.subtotal,
        discount_amount: billResult.discount_amount,
        tax_amount: billResult.tax_amount,
        total_amount: billResult.total_amount,
        paid_amount: '0.00',
        balance_amount: billResult.total_amount,
        created_at: new Date().toISOString(),
      };

      created.push(newInvoice);

      // RULE 7: No skipping: after invoicing, the next billing date moves forward by the plan period
      sub.next_billing_date = nextPeriodDate;
    }

    if (created.length > 0) {
      this.invoices = [...created, ...this.invoices];
    }
    this.persistAll();

    return {
      invoicesCreated: created,
      subscriptionsProcessed: processed,
      skippedDuplicates: skipped,
      closedSubscriptions: closed,
    };
  }

  // -------------------------------------------------------------
  // Dashboard Analytics Calculation (MRR, ARR, Churn, Invoiced vs Collected)
  // -------------------------------------------------------------
  public getDashboardStats(customerId?: string): DashboardStats {
    const subs = customerId
      ? this.subscriptions.filter((s) => s.customer_id === customerId)
      : this.subscriptions;
    const invs = customerId
      ? this.invoices.filter((i) => i.customer_id === customerId)
      : this.invoices;
    const pmts = customerId
      ? this.payments.filter((p) => p.customer_id === customerId)
      : this.payments;

    const activeSubs = subs.filter((s) => s.status === 'ACTIVE');
    const pausedSubs = subs.filter((s) => s.status === 'PAUSED');
    const closedSubs = subs.filter((s) => s.status === 'CLOSED');
    const activeCount = activeSubs.length;
    const pausedCount = pausedSubs.length;

    // Calculate MRR
    let mrrCents = 0;
    for (const sub of activeSubs) {
      let subSubtotalCents = 0;
      for (const line of sub.lines) {
        subSubtotalCents += line.quantity * toCents(line.unit_price);
      }
      mrrCents += normalizeToMrr(subSubtotalCents, sub.billing_period);
    }

    // ARR = MRR * 12
    const arrCents = mrrCents * 12;

    // Churn Rate: Closed subscriptions divided by (Active + Paused + Closed)
    const totalEverActive = activeCount + pausedCount + closedSubs.length;
    const churnPct =
      totalEverActive > 0
        ? ((closedSubs.length / totalEverActive) * 100).toFixed(1)
        : '0.0';

    // Total Invoiced vs Total Collected
    let totalInvoicedCents = 0;
    let totalOutstandingCents = 0;
    let overdueCount = 0;
    let overdueAmountCents = 0;

    for (const inv of invs) {
      if (inv.status !== 'CANCELLED') {
        totalInvoicedCents += toCents(inv.total_amount);
      }
      if (inv.status !== 'CANCELLED' && inv.status !== 'PAID') {
        const bal = toCents(inv.balance_amount);
        totalOutstandingCents += bal;

        if (isInvoiceOverdue(inv)) {
          overdueCount++;
          overdueAmountCents += bal;
        }
      }
    }

    // Total revenue collected (all payments)
    let totalRevenueCents = 0;
    for (const pay of pmts) {
      totalRevenueCents += toCents(pay.amount);
    }

    const collectionRatePct =
      totalInvoicedCents > 0
        ? Math.min(100, (totalRevenueCents / totalInvoicedCents) * 100).toFixed(1)
        : '100.0';

    const uniqueCustomers = new Set(subs.map((s) => s.customer_id)).size;

    console.debug('[Analytics Debug] Stats for', customerId || 'PLATFORM', {
      activeSubsCount: activeCount,
      pausedSubsCount: pausedCount,
      closedSubsCount: closedSubs.length,
      totalEverActive,
      mrrCents,
      arrCents,
      totalInvoicedCents,
      totalRevenueCents,
      churnPct,
      collectionRatePct,
    });

    return {
      active_subscriptions_count: activeCount,
      paused_subscriptions_count: pausedCount,
      mrr: toMoney(mrrCents),
      arr: toMoney(arrCents),
      churn_rate: `${churnPct}%`,
      total_invoiced: toMoney(totalInvoicedCents),
      total_revenue_collected: toMoney(totalRevenueCents),
      collection_rate: `${collectionRatePct}%`,
      total_outstanding: toMoney(totalOutstandingCents),
      overdue_invoices_count: overdueCount,
      overdue_amount: toMoney(overdueAmountCents),
      total_customers: uniqueCustomers,
    };
  }



}

// Singleton database instance
export const db = new DatabaseStore();
