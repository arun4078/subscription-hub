/**
 * Central Money and Billing Mathematics Engine
 * Corresponds to services/billing.py specified in the Brightloop Architecture.
 *
 * Rules:
 * - All monetary values handled as fixed-precision cents (integers) to avoid IEEE 754 floating point imprecision.
 * - String outputs are formatted strictly to 2 decimal places e.g. "1180.00".
 * - Rounding is Round-Half-Up (standard commercial accounting rule).
 * - Overdue is computed dynamically, never persisted:
 *     status === 'CONFIRMED' && due_date < today && balance > 0
 */

import {
  BillingPeriod,
  DiscountRule,
  Invoice,
  InvoiceLine,
  Subscription,
  TaxRule,
} from '../types';

/**
 * Converts a 2-decimal string or number to integer cents.
 * e.g. "1180.00" -> 118000 cents
 */
export function toCents(amount: string | number | undefined | null): number {
  if (!amount) return 0;
  const str = String(amount).trim();
  const clean = str.replace(/[^0-9.-]/g, '');
  if (!clean) return 0;
  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const sign = whole < 0 || clean.startsWith('-') ? -1 : 1;
  const absWhole = Math.abs(whole);
  let dec = 0;
  if (parts.length > 1) {
    const decStr = parts[1].padEnd(2, '0').slice(0, 2);
    dec = parseInt(decStr, 10);
  }
  return sign * (absWhole * 100 + dec);
}

/**
 * Converts integer cents to a 2-decimal string.
 * e.g. 118000 -> "1180.00"
 */
export function toMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`;
}

/**
 * Round half up integer cents from a float result
 */
export function roundCents(val: number): number {
  return Math.floor(val + 0.5);
}

/**
 * Checks if an invoice is overdue according to the strict rule:
 * Overdue is NOT stored. It is computed:
 * status is CONFIRMED, due date is before today, and balance is above 0.
 */
export function isInvoiceOverdue(
  invoice: Invoice,
  referenceDate: string = getTodayIso()
): boolean {
  if (invoice.status !== 'CONFIRMED') return false;
  const balanceCents = toCents(invoice.balance_amount);
  if (balanceCents <= 0) return false;
  return invoice.due_date < referenceDate;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD)
 */
export function getTodayIso(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Advances a date by one billing cycle.
 */
export function advanceBillingDate(
  currentDateIso: string,
  period: BillingPeriod
): string {
  const date = new Date(currentDateIso + 'T00:00:00Z');
  switch (period) {
    case 'DAILY':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'WEEKLY':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'MONTHLY':
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case 'YEARLY':
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Calculates due date based on payment terms.
 * e.g., "Net 15" -> issue_date + 15 days, "Net 30" -> issue_date + 30 days, "Immediate" -> issue_date
 */
export function calculateDueDate(issueDateIso: string, paymentTerms: string): string {
  const date = new Date(issueDateIso + 'T00:00:00Z');
  const lower = paymentTerms.toLowerCase();
  if (lower.includes('15')) {
    date.setUTCDate(date.getUTCDate() + 15);
  } else if (lower.includes('30')) {
    date.setUTCDate(date.getUTCDate() + 30);
  } else if (lower.includes('60')) {
    date.setUTCDate(date.getUTCDate() + 60);
  } else {
    // Immediate / default to 7 days
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Validates whether a discount rule applies to this subscription / line.
 */
export function isDiscountApplicable(
  discount: DiscountRule,
  currentDateIso: string,
  totalSubtotalCents: number,
  totalQuantity: number,
  productId?: string
): boolean {
  // Usage limit check
  if (discount.max_uses > 0 && discount.times_used >= discount.max_uses) {
    return false;
  }

  // Date validity check
  if (discount.start_date && currentDateIso < discount.start_date) {
    return false;
  }
  if (discount.end_date && currentDateIso > discount.end_date) {
    return false;
  }

  // Minimum purchase check
  if (discount.min_purchase) {
    const minCents = toCents(discount.min_purchase);
    if (totalSubtotalCents < minCents) {
      return false;
    }
  }

  // Minimum quantity check
  if (discount.min_quantity && totalQuantity < discount.min_quantity) {
    return false;
  }

  // Product specific check
  if (discount.applies_to === 'SPECIFIC_PRODUCT') {
    if (!productId || discount.product_id !== productId) {
      return false;
    }
  }

  return true;
}

/**
 * Single line calculation interface.
 * Implements Rule 2, 3, 4, 5:
 * 1. Line amount: quantity * unit price
 * 2. Discount first: apply valid discount (fixed or percentage)
 * 3. Then tax: (line amount minus discount) * tax rate
 * 4. Total: line amount - discount + tax (round half up per line)
 */
export function computeLineMath(
  quantity: number,
  unitPriceStr: string,
  taxRatePercentStr: string,
  discountCentsForLine: number = 0
): {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
} {
  const unitPriceCents = toCents(unitPriceStr);
  const subtotalCents = quantity * unitPriceCents;
  const cappedDiscountCents = Math.min(discountCentsForLine, subtotalCents);
  const taxableCents = subtotalCents - cappedDiscountCents;

  const taxRate = parseFloat(taxRatePercentStr || '0') / 100;
  const taxCents = roundCents(taxableCents * taxRate);
  const totalCents = taxableCents + taxCents;

  return {
    subtotalCents,
    discountCents: cappedDiscountCents,
    taxableCents,
    taxCents,
    totalCents,
  };
}

/**
 * Generate invoice lines and totals for a subscription.
 */
export function calculateSubscriptionBilling(
  subscription: Subscription,
  taxes: TaxRule[],
  discounts: DiscountRule[],
  billingDateIso: string = getTodayIso()
): {
  lines: InvoiceLine[];
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  applied_discount?: DiscountRule;
} {
  // Pre-calculate aggregate quantities and raw line subtotals
  let totalQuantity = 0;
  let preliminarySubtotalCents = 0;

  for (const line of subscription.lines) {
    totalQuantity += line.quantity;
    preliminarySubtotalCents += line.quantity * toCents(line.unit_price);
  }

  // Find matching discount
  let matchedDiscount: DiscountRule | undefined;
  if (subscription.discount_code) {
    const code = subscription.discount_code.trim().toUpperCase();
    matchedDiscount = discounts.find(
      (d) => d.code.toUpperCase() === code
    );
  }

  let isDiscountValid = false;
  if (matchedDiscount) {
    isDiscountValid = isDiscountApplicable(
      matchedDiscount,
      billingDateIso,
      preliminarySubtotalCents,
      totalQuantity
    );
  }

  // Calculate discount distribution across lines
  let remainingDiscountCents = 0;
  if (matchedDiscount && isDiscountValid) {
    if (matchedDiscount.discount_type === 'PERCENTAGE') {
      const pct = parseFloat(matchedDiscount.value) / 100;
      remainingDiscountCents = roundCents(preliminarySubtotalCents * pct);
    } else {
      // FIXED discount
      remainingDiscountCents = toCents(matchedDiscount.value);
    }
  }

  const invoiceLines: InvoiceLine[] = [];
  let aggregateSubtotalCents = 0;
  let aggregateDiscountCents = 0;
  let aggregateTaxCents = 0;
  let aggregateTotalCents = 0;

  const taxMap = new Map<string, string>();
  taxes.forEach((t) => taxMap.set(t.id, t.rate));

  for (let i = 0; i < subscription.lines.length; i++) {
    const line = subscription.lines[i];
    const lineSubtotalCents = line.quantity * toCents(line.unit_price);

    let lineDiscountCents = 0;
    if (remainingDiscountCents > 0 && preliminarySubtotalCents > 0) {
      if (i === subscription.lines.length - 1) {
        // Last line takes remaining rounding fraction
        lineDiscountCents = Math.min(remainingDiscountCents, lineSubtotalCents);
      } else {
        const proportion = lineSubtotalCents / preliminarySubtotalCents;
        lineDiscountCents = Math.min(
          roundCents(remainingDiscountCents * proportion),
          lineSubtotalCents
        );
      }
      remainingDiscountCents -= lineDiscountCents;
    }

    const taxRate = (line.tax_id && taxMap.get(line.tax_id)) || line.tax_rate || '0.00';
    const math = computeLineMath(
      line.quantity,
      line.unit_price,
      taxRate,
      lineDiscountCents
    );

    aggregateSubtotalCents += math.subtotalCents;
    aggregateDiscountCents += math.discountCents;
    aggregateTaxCents += math.taxCents;
    aggregateTotalCents += math.totalCents;

    invoiceLines.push({
      id: `inv-line-${i + 1}-${Date.now()}`,
      product_name: line.product_name,
      variant_name: line.variant_name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      subtotal: toMoney(math.subtotalCents),
      discount_amount: toMoney(math.discountCents),
      tax_rate: taxRate,
      tax_amount: toMoney(math.taxCents),
      total: toMoney(math.totalCents),
    });
  }

  return {
    lines: invoiceLines,
    subtotal: toMoney(aggregateSubtotalCents),
    discount_amount: toMoney(aggregateDiscountCents),
    tax_amount: toMoney(aggregateTaxCents),
    total_amount: toMoney(aggregateTotalCents),
    applied_discount: isDiscountValid ? matchedDiscount : undefined,
  };
}

/**
 * Normalizes recurring subscription value to standard Monthly Recurring Revenue (MRR).
 */
export function normalizeToMrr(amountCents: number, period: BillingPeriod): number {
  switch (period) {
    case 'DAILY':
      return amountCents * 30;
    case 'WEEKLY':
      return roundCents((amountCents * 52) / 12);
    case 'MONTHLY':
      return amountCents;
    case 'YEARLY':
      return roundCents(amountCents / 12);
  }
}
