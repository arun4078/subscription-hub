// Authoritative Domain Types for Brightloop Subscription Management System

export type Role = "ADMIN" | "STAFF" | "CUSTOMER";

export type BillingPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type SubscriptionStatus =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "ACTIVE"
  | "CLOSED";

export type InvoiceStatus = "DRAFT" | "CONFIRMED" | "PAID" | "CANCELLED";

export type DiscountType = "FIXED" | "PERCENTAGE";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "UPI"
  | "OTHER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  customerId?: number | null;
  permissions?: string[];
  companyName?: string;
  deviceId?: string;
  deviceName?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  extraPrice: number; // e.g. +560 for Odoo brand
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  type: "SOFTWARE" | "SERVICE" | "HARDWARE";
  salesPrice: number;
  costPrice: number;
  notes: string;
  variants: ProductVariant[];
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  productId: string;
  price: number;
  billingPeriod: BillingPeriod;
  minimumQuantity: number;
  availableFrom: string;
  availableUntil?: string;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number; // e.g. 18.0 for 18%
  description: string;
  isDefault: boolean;
}

export interface DiscountRule {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  value: number; // amount or percentage (e.g. 10 for 10% or 250 for $250)
  minQuantity?: number;
  minPurchaseAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  productId?: string; // Optional: specific to a product or whole subscription
  isActive: boolean;
}

export interface QuotationTemplateLine {
  id: string;
  productId: string;
  variantId?: string;
  planId: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  validityDays: number;
  planId: string;
  lines: QuotationTemplateLine[];
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  companyName: string;
  phone?: string;
  address?: string;
  status?: "ACTIVE" | "ARCHIVED";
  deviceId?: string;
  deviceName?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface SubscriptionLine {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  variantExtra: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string; // e.g. SUB-2026-001
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  planId: string;
  planName: string;
  billingPeriod: BillingPeriod;
  startDate: string;
  expiryDate?: string;
  nextBillingDate: string;
  paymentTerms: string; // e.g. "Net 15"
  status: SubscriptionStatus;
  lines: SubscriptionLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  autoClose: boolean;
  pausable: boolean;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-001
  subscriptionId: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerCompany: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  notes?: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

// API Response format per spec:
// Success: { "data": ... }
// List: { "data": [...], "page": 1, "page_size": 10, "total": 100 }
// Error: { "error": { "code": "...", "message": "..." } }
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
