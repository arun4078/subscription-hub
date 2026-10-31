/**
 * Brightloop Subscription Management System - Shared Types and Enums
 * Adheres strictly to the Brightloop Project Plan specification.
 */

// Shared Enums (exact match to specification)
export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED';

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export type DiscountType = 'FIXED' | 'PERCENTAGE';

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'NET_BANKING'
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'CARD'
  | 'OTHER';

export type ProductType = 'SOFTWARE_LICENSE' | 'SERVICE' | 'ADDON' | 'HARDWARE';

// User Account
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company_name?: string;
  phone?: string;
  created_at: string;
}

// Product Variant
export interface ProductVariant {
  id: string;
  name: string; // e.g., "Odoo Brand Edition", "Enterprise", "Pro"
  extra_price: string; // 2-decimal string e.g. "560.00"
}

// Product
export interface Product {
  id: string;
  name: string;
  type: ProductType;
  sales_price: string; // "1200.00"
  cost_price: string; // "800.00"
  notes: string;
  variants: ProductVariant[];
  created_at: string;
}

// Plan
export interface Plan {
  id: string;
  name: string;
  price: string; // base price "1000.00"
  billing_period: BillingPeriod;
  min_quantity: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  auto_close: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  description: string;
}

// Tax Rule
export interface TaxRule {
  id: string;
  name: string; // e.g. "GST 18%", "VAT 10%"
  rate: string; // percentage string e.g. "18.00"
  is_active: boolean;
}

// Discount Rule
export interface DiscountRule {
  id: string;
  code: string; // e.g. "EARLYBIRD10", "VOLUME50"
  name: string;
  discount_type: DiscountType;
  value: string; // "10.00" percent or "100.00" fixed
  min_purchase?: string; // min total amount
  min_quantity?: number; // min seats/quantity
  start_date: string;
  end_date: string;
  max_uses: number;
  times_used: number;
  applies_to: 'WHOLE_SUBSCRIPTION' | 'SPECIFIC_PRODUCT';
  product_id?: string;
}

// Quotation Template Line
export interface TemplateLine {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: string;
  tax_id?: string;
}

// Quotation Template
export interface QuotationTemplate {
  id: string;
  name: string;
  plan_id: string;
  valid_days: number;
  lines: TemplateLine[];
  notes?: string;
}

// Subscription Line Item
export interface SubscriptionLine {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: string; // 2-decimal string
  tax_id?: string;
  tax_rate?: string;
}

// Subscription Record
export interface Subscription {
  id: string;
  subscription_number: string; // e.g., "SUB-2026-001"
  customer_id: string;
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  billing_period: BillingPeriod;
  status: SubscriptionStatus;
  start_date: string; // ISO / YYYY-MM-DD
  expiry_date: string;
  next_billing_date: string;
  payment_terms: string; // e.g. "Net 15", "Immediate", "Net 30"
  lines: SubscriptionLine[];
  discount_code?: string;
  auto_close: boolean;
  closable: boolean;
  pausable?: boolean;
  paused_at?: string;
  pause_reason?: string;
  created_at: string;
}

// Invoice Line Item
export interface InvoiceLine {
  id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  discount_amount: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
}

// Invoice Record
export interface Invoice {
  id: string;
  invoice_number: string; // e.g., "INV-2026-001"
  subscription_id: string;
  subscription_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  billing_period_start: string;
  billing_period_end: string;
  lines: InvoiceLine[];
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  created_at: string;
}

// Payment Record
export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  note: string;
  created_at: string;
}

// Finance Dashboard Analytics
export interface DashboardStats {
  active_subscriptions_count: number;
  paused_subscriptions_count: number;
  mrr: string; // Monthly Recurring Revenue normalized
  arr: string; // Annual Recurring Revenue (MRR * 12)
  churn_rate: string; // Churn %
  total_invoiced: string;
  total_revenue_collected: string;
  collection_rate: string; // Collected / Invoiced %
  total_outstanding: string;
  overdue_invoices_count: number;
  overdue_amount: string;
  total_customers: number;
}
