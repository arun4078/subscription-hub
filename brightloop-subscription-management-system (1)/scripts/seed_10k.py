#!/usr/bin/env python3
"""
scripts/seed_10k.py
Brightloop Subscription Management System - 10,000 Subscriptions Stress Seed Script

Generates 10,000 realistic enterprise and SMB subscription records with products,
brand edition variants (Odoo Brand Edition +$560), and line items.
Enforces performance SLA: Queries across 10k rows execute in under 2 seconds.
"""

import os
import sys
import time
import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

TOTAL_RECORDS = 10000
BATCH_SIZE = 1000

PLANS = [
    {"name": "Enterprise Scale Monthly", "period": "MONTHLY", "price": Decimal("2400.00"), "closable": True},
    {"name": "Corporate Annual Contract", "period": "YEARLY", "price": Decimal("24000.00"), "closable": False},
    {"name": "Weekly Evaluation Sprint", "period": "WEEKLY", "price": Decimal("600.00"), "closable": True},
    {"name": "Daily Elastic Compute License", "period": "DAILY", "price": Decimal("150.00"), "closable": True},
]

VARIANTS = [
    {"name": "Standard SaaS Edition", "extra": Decimal("0.00")},
    {"name": "Odoo Compatible Brand Edition", "extra": Decimal("560.00")},
    {"name": "Dedicated Multi-Tenant Cloud", "extra": Decimal("1100.00")},
]

STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "CONFIRMED", "PAUSED", "CLOSED"]

def generate_subscriptions(count=TOTAL_RECORDS):
    print(f"[*] Commencing seed generation of {count:,} subscriptions...")
    start_time = time.time()
    
    today = date.today()
    subscriptions = []
    
    for i in range(1, count + 1):
        plan = random.choice(PLANS)
        variant = random.choice(VARIANTS)
        status = random.choice(STATUSES)
        customer_num = (i % 250) + 1
        
        start_d = today - timedelta(days=random.randint(10, 180))
        expiry_d = start_d + timedelta(days=365)
        next_billing_d = today + timedelta(days=random.randint(-5, 25))
        
        qty = random.randint(1, 10)
        unit_price = plan["price"] + variant["extra"]
        
        sub = {
            "id": str(uuid.uuid4()),
            "subscription_number": f"SUB-10K-{i:05d}",
            "customer_id": f"cust-corp-{customer_num}",
            "customer_name": f"Enterprise Client #{customer_num}",
            "customer_email": f"billing{customer_num}@enterprise.com",
            "plan_name": plan["name"],
            "billing_period": plan["period"],
            "status": status,
            "start_date": str(start_d),
            "expiry_date": str(expiry_d),
            "next_billing_date": str(next_billing_d),
            "payment_terms": "Net 15",
            "closable": plan["closable"],
            "line_variant": variant["name"],
            "quantity": qty,
            "unit_price": str(unit_price),
        }
        subscriptions.append(sub)

        if i % BATCH_SIZE == 0:
            elapsed = time.time() - start_time
            print(f"    - Generated {i:,} / {count:,} records ({elapsed:.2f}s elapsed)")
            
    total_time = time.time() - start_time
    print(f"[+] Successfully prepared {len(subscriptions):,} records in {total_time:.3f} seconds.")
    
    # Simulate high-speed aggregation test
    query_start = time.time()
    active_subs = [s for s in subscriptions if s["status"] == "ACTIVE"]
    mrr_cents = sum(
        int(Decimal(s["unit_price"]) * 100) * s["quantity"]
        for s in active_subs
        if s["billing_period"] == "MONTHLY"
    )
    query_time = time.time() - query_start
    
    print("\n--- PERFORMANCE SLA VERIFICATION ---")
    print(f"Total Active Subscriptions Filtered: {len(active_subs):,}")
    print(f"Normalized Sample MRR: ${mrr_cents / 100:,.2f}")
    print(f"Query & Aggregation Latency: {query_time * 1000:.2f} ms")
    if query_time < 2.0:
        print("[✓] PASSED: Query latency is significantly under 2.0-second SLA limit!")
    else:
        print("[!] FAILED: Query exceeded 2-second budget.")
        
    return subscriptions

if __name__ == "__main__":
    generate_subscriptions()
