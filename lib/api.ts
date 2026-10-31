// Centralized API Client for Brightloop Subscription Management System
// Matches REST API backend conventions:
// - Prefix: /api/v1/
// - Endpoints: plural lowercase URLs with hyphens
// - Action subroutes: POST /subscriptions/{id}/confirm, POST /invoices/{id}/payments
// Uses mock store with fallback to real API when NEXT_PUBLIC_API_URL is configured.

import {
  User,
  Product,
  Plan,
  TaxRule,
  DiscountRule,
  QuotationTemplate,
  Customer,
  Subscription,
  SubscriptionStatus,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  ApiResponse,
  ApiListResponse,
} from "./types";
import {
  mockStaffList,
  mockProducts,
  mockPlans,
  mockTaxRules,
  mockDiscountRules,
  mockTemplates,
  mockCustomers,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
} from "./mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// In-memory / browser persistent mock database store
class LocalStore {
  staff: User[] = [...mockStaffList];
  products: Product[] = [...mockProducts];
  plans: Plan[] = [...mockPlans];
  taxes: TaxRule[] = [...mockTaxRules];
  discounts: DiscountRule[] = [...mockDiscountRules];
  templates: QuotationTemplate[] = [...mockTemplates];
  customers: Customer[] = [...mockCustomers];
  subscriptions: Subscription[] = [...mockSubscriptions];
  invoices: Invoice[] = [...mockInvoices];
  payments: Payment[] = [...mockPayments];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("brightloop_store_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          this.staff = parsed.staff || this.staff;
          this.products = parsed.products || this.products;
          this.plans = parsed.plans || this.plans;
          this.taxes = parsed.taxes || this.taxes;
          this.discounts = parsed.discounts || this.discounts;
          this.templates = parsed.templates || this.templates;
          this.customers = parsed.customers || this.customers;
          this.subscriptions = parsed.subscriptions || this.subscriptions;
          this.invoices = parsed.invoices || this.invoices;
          this.payments = parsed.payments || this.payments;
        }
      } catch {
        // use defaults
      }
    }
  }

  save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "brightloop_store_v1",
          JSON.stringify({
            staff: this.staff,
            products: this.products,
            plans: this.plans,
            taxes: this.taxes,
            discounts: this.discounts,
            templates: this.templates,
            customers: this.customers,
            subscriptions: this.subscriptions,
            invoices: this.invoices,
            payments: this.payments,
          })
        );
      } catch {
        // ignore
      }
    }
  }
}

const store = new LocalStore();

// Helper to check if invoice is overdue (computed status per spec:
// CONFIRMED status + due date before today + unpaid balance > 0)
export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status !== "CONFIRMED") return false;
  const today = new Date().toISOString().split("T")[0];
  const unpaid = invoice.total - invoice.amountPaid;
  return invoice.dueDate < today && unpaid > 0.001;
}

// -------------------------------------------------------------
// Centralized API Client methods
// -------------------------------------------------------------
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("brightloop_auth_session_v1");
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

export const api = {
  // Staff
  async getStaff(): Promise<ApiListResponse<User>> {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/staff`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const users: User[] = (json.data || []).map((u: any) => ({
          id: String(u.id),
          name: u.full_name || u.name,
          email: u.email,
          role: u.role,
          isActive: u.is_active ?? true,
          createdAt: u.created_at || new Date().toISOString(),
        }));
        return { data: users, page: json.page || 1, page_size: json.page_size || users.length, total: json.total || users.length };
      }
    } catch {
      // fallback to store
    }
    return { data: store.staff, page: 1, page_size: store.staff.length, total: store.staff.length };
  },

  async addStaff(staffData: { name: string; email: string; role: "STAFF"; password?: string }): Promise<ApiResponse<User>> {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: staffData.name,
          email: staffData.email,
          password: staffData.password || "Staff@123!",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const u = json.data;
        const newUser: User = {
          id: String(u.id),
          name: u.full_name,
          email: u.email,
          role: u.role,
          isActive: u.is_active ?? true,
          createdAt: u.created_at || new Date().toISOString(),
        };
        store.staff.push(newUser);
        store.save();
        return { data: newUser };
      }
    } catch {
      // fallback to store
    }
    const newUser: User = {
      id: `usr-staff-${Date.now()}`,
      name: staffData.name,
      email: staffData.email,
      role: staffData.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.staff.push(newUser);
    store.save();
    return { data: newUser };
  },


  // Products
  async getProducts(): Promise<ApiListResponse<Product>> {
    return { data: store.products, page: 1, page_size: store.products.length, total: store.products.length };
  },

  async createProduct(productData: Omit<Product, "id" | "createdAt">): Promise<ApiResponse<Product>> {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    store.products.push(newProduct);
    store.save();
    return { data: newProduct };
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    store.products[idx] = { ...store.products[idx], ...productData };
    store.save();
    return { data: store.products[idx] };
  },

  // Plans
  async getPlans(): Promise<ApiListResponse<Plan>> {
    return { data: store.plans, page: 1, page_size: store.plans.length, total: store.plans.length };
  },

  async createPlan(planData: Omit<Plan, "id">): Promise<ApiResponse<Plan>> {
    const newPlan: Plan = {
      ...planData,
      id: `plan-${Date.now()}`,
    };
    store.plans.push(newPlan);
    store.save();
    return { data: newPlan };
  },

  async updatePlan(id: string, planData: Partial<Plan>): Promise<ApiResponse<Plan>> {
    const idx = store.plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Plan not found");
    store.plans[idx] = { ...store.plans[idx], ...planData };
    store.save();
    return { data: store.plans[idx] };
  },

  // Taxes
  async getTaxes(): Promise<ApiListResponse<TaxRule>> {
    return { data: store.taxes, page: 1, page_size: store.taxes.length, total: store.taxes.length };
  },

  async createTax(taxData: Omit<TaxRule, "id">): Promise<ApiResponse<TaxRule>> {
    const newTax: TaxRule = {
      ...taxData,
      id: `tax-${Date.now()}`,
    };
    store.taxes.push(newTax);
    store.save();
    return { data: newTax };
  },

  async updateTax(id: string, taxData: Partial<TaxRule>): Promise<ApiResponse<TaxRule>> {
    const idx = store.taxes.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Tax rule not found");
    store.taxes[idx] = { ...store.taxes[idx], ...taxData };
    store.save();
    return { data: store.taxes[idx] };
  },

  // Discounts
  async getDiscounts(): Promise<ApiListResponse<DiscountRule>> {
    return { data: store.discounts, page: 1, page_size: store.discounts.length, total: store.discounts.length };
  },

  async createDiscount(discountData: Omit<DiscountRule, "id" | "usageCount">): Promise<ApiResponse<DiscountRule>> {
    const newDiscount: DiscountRule = {
      ...discountData,
      id: `disc-${Date.now()}`,
      usageCount: 0,
    };
    store.discounts.push(newDiscount);
    store.save();
    return { data: newDiscount };
  },

  async updateDiscount(id: string, discountData: Partial<DiscountRule>): Promise<ApiResponse<DiscountRule>> {
    const idx = store.discounts.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("Discount rule not found");
    store.discounts[idx] = { ...store.discounts[idx], ...discountData };
    store.save();
    return { data: store.discounts[idx] };
  },

  // Quotation Templates
  async getTemplates(): Promise<ApiListResponse<QuotationTemplate>> {
    return { data: store.templates, page: 1, page_size: store.templates.length, total: store.templates.length };
  },

  async createTemplate(templateData: Omit<QuotationTemplate, "id">): Promise<ApiResponse<QuotationTemplate>> {
    const newTmpl: QuotationTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
    };
    store.templates.push(newTmpl);
    store.save();
    return { data: newTmpl };
  },

  async updateTemplate(id: string, templateData: Partial<QuotationTemplate>): Promise<ApiResponse<QuotationTemplate>> {
    const idx = store.templates.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Template not found");
    store.templates[idx] = { ...store.templates[idx], ...templateData };
    store.save();
    return { data: store.templates[idx] };
  },

  // Customers
  async getCustomers(): Promise<ApiListResponse<Customer>> {
    return { data: store.customers, page: 1, page_size: store.customers.length, total: store.customers.length };
  },

  async createCustomer(customerData: Omit<Customer, "id" | "createdAt">): Promise<ApiResponse<Customer>> {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    store.customers.push(newCustomer);
    store.save();
    return { data: newCustomer };
  },

  async ensureCustomerRecord(customerData: {
    id?: string;
    name: string;
    email: string;
    companyName?: string;
    phone?: string;
    address?: string;
    deviceId?: string;
    deviceName?: string;
  }): Promise<Customer> {
    const cleanEmail = customerData.email.trim().toLowerCase();
    const existingIdx = store.customers.findIndex(
      (c) => c.email.toLowerCase() === cleanEmail
    );

    if (existingIdx !== -1) {
      store.customers[existingIdx] = {
        ...store.customers[existingIdx],
        name: customerData.name || store.customers[existingIdx].name,
        companyName: customerData.companyName || store.customers[existingIdx].companyName,
        phone: customerData.phone || store.customers[existingIdx].phone,
        address: customerData.address || store.customers[existingIdx].address,
        deviceId: customerData.deviceId || store.customers[existingIdx].deviceId,
        deviceName: customerData.deviceName || store.customers[existingIdx].deviceName,
        lastLogin: new Date().toISOString(),
      };
      store.save();
      return store.customers[existingIdx];
    } else {
      const newCustomer: Customer = {
        id: customerData.id || `cust-${Date.now()}`,
        name: customerData.name,
        email: cleanEmail,
        companyName: customerData.companyName || `${customerData.name} Org`,
        phone: customerData.phone || "+1 (555) 000-0000",
        address: customerData.address || "Online Registered Account",
        status: "ACTIVE",
        deviceId: customerData.deviceId,
        deviceName: customerData.deviceName,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      store.customers.unshift(newCustomer);
      store.save();
      return newCustomer;
    }
  },

  // Subscriptions
  async getSubscriptions(statusFilter?: SubscriptionStatus): Promise<ApiListResponse<Subscription>> {
    let list = store.subscriptions;
    if (statusFilter) {
      list = list.filter((s) => s.status === statusFilter);
    }
    return { data: list, page: 1, page_size: list.length, total: list.length };
  },

  async getSubscriptionById(id: string): Promise<ApiResponse<Subscription>> {
    const sub = store.subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error("Subscription not found");
    return { data: sub };
  },

  async createSubscription(subData: Omit<Subscription, "id" | "subscriptionNumber" | "createdAt">): Promise<ApiResponse<Subscription>> {
    const subNumber = `SUB-2026-${String(store.subscriptions.length + 1).padStart(3, "0")}`;
    const newSub: Subscription = {
      ...subData,
      id: `sub-${Date.now()}`,
      subscriptionNumber: subNumber,
      createdAt: new Date().toISOString(),
    };
    store.subscriptions.unshift(newSub);
    store.save();
    return { data: newSub };
  },

  async updateSubscription(id: string, subData: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    const idx = store.subscriptions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Subscription not found");
    store.subscriptions[idx] = { ...store.subscriptions[idx], ...subData };
    store.save();
    return { data: store.subscriptions[idx] };
  },

  // Lifecycle status actions (DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED)
  async transitionSubscriptionStatus(id: string, nextStatus: SubscriptionStatus): Promise<ApiResponse<Subscription>> {
    const idx = store.subscriptions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Subscription not found");
    store.subscriptions[idx].status = nextStatus;
    store.save();
    return { data: store.subscriptions[idx] };
  },

  // Invoices
  async getInvoices(statusFilter?: InvoiceStatus): Promise<ApiListResponse<Invoice>> {
    let list = store.invoices;
    if (statusFilter) {
      list = list.filter((i) => i.status === statusFilter);
    }
    return { data: list, page: 1, page_size: list.length, total: list.length };
  },

  async getInvoiceById(id: string): Promise<ApiResponse<Invoice>> {
    const inv = store.invoices.find((i) => i.id === id);
    if (!inv) throw new Error("Invoice not found");
    return { data: inv };
  },

  async createInvoice(invoiceData: Omit<Invoice, "id" | "invoiceNumber">): Promise<ApiResponse<Invoice>> {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNumber: `INV-2026-${String(store.invoices.length + 1).padStart(3, "0")}`,
    };
    store.invoices.unshift(newInvoice);
    store.save();
    return { data: newInvoice };
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<ApiResponse<Invoice>> {
    const idx = store.invoices.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Invoice not found");
    store.invoices[idx].status = status;
    store.save();
    return { data: store.invoices[idx] };
  },

  // Payments
  async getPayments(): Promise<ApiListResponse<Payment>> {
    return { data: store.payments, page: 1, page_size: store.payments.length, total: store.payments.length };
  },

  async recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
  }): Promise<ApiResponse<Payment>> {
    const inv = store.invoices.find((i) => i.id === paymentData.invoiceId);
    if (!inv) throw new Error("Invoice not found");

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-2026-${String(store.payments.length + 1).padStart(3, "0")}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentDate: new Date().toISOString(),
      referenceNumber: paymentData.referenceNumber,
      notes: paymentData.notes,
    };

    store.payments.unshift(newPayment);

    // Rule 8: Payments accumulate against invoices. Mark PAID only when total payments reach invoice total.
    inv.amountPaid = Number((inv.amountPaid + paymentData.amount).toFixed(2));
    if (inv.amountPaid >= inv.total - 0.001) {
      inv.status = "PAID";
    }

    store.save();
    return { data: newPayment };
  },

  // Billing Day Engine Execution (Run Billing)
  // Reflects Billing Rules 1-7:
  // 1. Only ACTIVE subscriptions whose next billing date is today or earlier are due.
  // 2. Line amount = quantity * unit price + variant extras.
  // 3. Apply valid discounts before tax.
  // 4. Tax = discounted line amount * tax rate.
  // 5. Round half up to 2 decimal places per line.
  // 6. Prevent duplicate billing for the same subscription and billing period.
  // 7. Advance next billing date by the plan period.
  async runBilling(): Promise<{ generatedCount: number; invoices: Invoice[]; message: string }> {
    const today = new Date().toISOString().split("T")[0];
    const generated: Invoice[] = [];

    for (const sub of store.subscriptions) {
      if (sub.status !== "ACTIVE") continue;
      // Only subscriptions due today or earlier
      if (sub.nextBillingDate > today) continue;

      // Prevent duplicate billing for the same subscription and billing period
      const existing = store.invoices.find(
        (i) => i.subscriptionId === sub.id && i.issueDate === today
      );
      if (existing) continue;

      // Calculate lines
      const invLines = sub.lines.map((line, idx) => {
        const lineTotalBeforeDisc = (line.unitPrice + (line.variantExtra || 0)) * line.quantity;
        const lineDiscount = sub.subtotal > 0 ? (lineTotalBeforeDisc / sub.subtotal) * sub.discountTotal : 0;
        const discountedBase = Math.max(0, lineTotalBeforeDisc - lineDiscount);
        const lineTax = (discountedBase * line.taxRate) / 100;
        const lineTotal = Math.round((discountedBase + lineTax) * 100) / 100;

        return {
          id: `iline-${Date.now()}-${idx}`,
          description: `${line.productName}${line.variantName ? ` (${line.variantName})` : ""} - ${line.quantity} unit(s)`,
          quantity: line.quantity,
          unitPrice: line.unitPrice + (line.variantExtra || 0),
          discountAmount: Math.round(lineDiscount * 100) / 100,
          taxAmount: Math.round(lineTax * 100) / 100,
          lineTotal: lineTotal,
        };
      });

      const invSubtotal = sub.subtotal;
      const invDiscount = sub.discountTotal;
      const invTax = sub.taxTotal;
      const invTotal = Math.round((invSubtotal - invDiscount + invTax) * 100) / 100;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const newInv: Invoice = {
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoiceNumber: `INV-2026-${String(store.invoices.length + 1).padStart(3, "0")}`,
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerId: sub.customerId,
        customerName: sub.customerName,
        customerCompany: sub.customerCompany,
        subtotal: invSubtotal,
        discountAmount: invDiscount,
        taxAmount: invTax,
        total: invTotal,
        amountPaid: 0,
        status: "CONFIRMED",
        issueDate: today,
        dueDate: dueDate.toISOString().split("T")[0],
        lines: invLines,
        notes: `Generated by automated billing run for period starting ${sub.nextBillingDate}.`,
      };

      store.invoices.unshift(newInv);
      generated.push(newInv);

      // Advance next billing date by plan period
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingPeriod === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
      else if (sub.billingPeriod === "WEEKLY") nextDate.setDate(nextDate.setDate(nextDate.getDate() + 7));
      else if (sub.billingPeriod === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.billingPeriod === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

      sub.nextBillingDate = nextDate.toISOString().split("T")[0];
    }

    store.save();
    return {
      generatedCount: generated.length,
      invoices: generated,
      message:
        generated.length > 0
          ? `Billing completed: Generated ${generated.length} invoice(s) with discounts and taxes applied.`
          : "All active subscriptions are currently up to date. No new invoices were required.",
    };
  },
};
