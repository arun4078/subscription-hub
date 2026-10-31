# Brightloop Subscription Management System

Enterprise recurring billing, plan lifecycle, quotation templates, automated invoicing, and real-time revenue analytics platform for **Brightloop Software**.

---

## 1. Quick Start & Demo Logins

The application comes pre-seeded with realistic data across all modules and 3 distinct user roles. You can use the quick-switcher in the top right or log in with these credentials:

| Role | Name | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Alexander Sterling | `admin@brightloop.io` | `Password@123` | Full control: products, variants, plans, taxes, discounts, staff |
| **STAFF** | Elena Rostova (Finance) | `finance@brightloop.io` | `Password@123` | Daily operations: quotes, subscriptions, batch billing, payments |
| **CUSTOMER** | Samantha Reed (Acme Corp) | `contact@acmecorp.com` | `Password@123` | Customer Portal: my subscriptions, pause/cancel, invoices, receipts |
| **CUSTOMER** | David Chen (NovaTech) | `buyer@novatech.io` | `Password@123` | Customer Portal: annual contract, paid invoices, print receipts |

---

## 2. Key Modules & Architectural Rules

### A. Customer Portal
- **Subscriptions Management**: Inspect active subscriptions, next billing dates, and payment terms.
- **Brand Editions & Variant Selection**: Choose from specialized architectures including **Odoo Brand Edition** (`+$560.00 / unit`), **Dedicated Cloud** (`+$1,100.00 / unit`), and **Standard SaaS**.
- **Pause & Cancel**: Self-service pause/resume and contract cancellation for eligible subscriptions.
- **Invoice Receipts & PDF**: Formal tax invoices with browser print and PDF generation (`window.print()`).
- **Online Direct Payment**: Instant payment settlement via Card, Wire Transfer, or UPI.

### B. Billing Engine & Mathematical Invariants
All money math adheres to fixed-precision decimal arithmetic (implemented in `services/billing.py` and `src/services/billing.ts`):
1. **Line Subtotal**: `Quantity × (Plan Price + Variant Surcharge)`.
2. **Discount First**: Automated discounts (Fixed or Percentage) are validated and deducted before tax.
3. **Tax Calculation**: Applied on the balance after discount, rounded half-up to 2 decimals per line.
4. **Idempotency & Anti-Double Billing**:
   - Enforces unique constraint: `UNIQUE (subscription_id, billing_period_start)`.
   - Running batch billing multiple times will never produce duplicate invoices.
5. **Cadence Progression**:
   - After invoicing, `next_billing_date` advances forward by plan period (Daily, Weekly, Monthly, Yearly).
6. **Dynamic Overdue Rule**:
   - Overdue is **never stored statically**.
   - Computed dynamically: `status === 'CONFIRMED' && due_date < today && balance > 0`.

### C. Finance & Revenue Analytics
- **MRR (Monthly Recurring Revenue)**: Normalized recurring income across daily, weekly, monthly, and annual commitments.
- **ARR (Annual Recurring Revenue)**: Run-rate projection (`MRR × 12`).
- **Logo Churn Rate**: Ratio of cancelled contracts to all activated agreements.
- **Invoiced vs. Collected**: 12-month cohort analysis tracking billed receivables versus deposited cash.

---

## 3. Infrastructure & 10,000 Subscriptions Performance SLA

### 2-Second Performance Guarantee
The platform is designed to query, aggregate, and render over **10,000 active subscriptions in under 2 seconds** (< 50ms typical response time):
- **B-Tree Database Indexes**:
  - `idx_subs_customer ON subscriptions(customer_id)`
  - `idx_subs_status ON subscriptions(status)`
  - `idx_subs_next_billing ON subscriptions(next_billing_date)`
  - `idx_invoices_due_date ON invoices(due_date)`
- **In-Memory Query Caching**: Write-through cache invalidation preventing full table scans on repeated metric calculations.

### Seeding 10,000 Records
Run the stress test seed script:
```bash
python3 scripts/seed_10k.py
```
Or execute the live in-browser benchmark under **10k Benchmark & SLA** in the portal navigation.

---

## 4. Running with Docker Compose

To spin up the complete production stack (Web app + PostgreSQL 16 + Redis Cache):

```bash
# 1. Start all containers
docker-compose up -d

# 2. Check health status
docker-compose ps

# 3. View application logs
docker-compose logs -f web
```
The app will be accessible at `http://localhost:3000`.

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run static type checking
npx tsc --noEmit

# Run production build
npm run build
```

---

## 6. Continuous Integration (CI)

GitHub Actions workflow is located at `.github/workflows/ci.yml`. It runs on every pull request and commit:
1. Installs Node.js & Python dependencies.
2. Validates TypeScript types (`tsc --noEmit`).
3. Executes production build (`npm run build`).
4. Executes the 10,000 subscriptions benchmark script verifying sub-2-second execution.
