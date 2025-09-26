# Billing and Wallet Specifications

## Purpose
Outlines the payment, subscription, and wallet management system for a USD-based SaaS platform. All transactions use Stripe for processing; wallet serves as the single deduction source. Emphasizes stateless/serverless design with idempotent webhooks. Current gaps: No real wallet ledger; incomplete subscription auto-topup; missing invoice downloads and admin reconciliation.

## 1. Overall Model
- **USD-Centric**: All pricing, top-ups, and deductions in USD. No credits/quotas; wallet balance accumulates without monthly resets.
- **Hybrid Billing**: Subscriptions provide auto-monthly top-ups + discounts + entitlements. Pay-as-you-go via manual wallet recharges.
- **Stateless**: JWT sessions; Redis for denylists and event streams. Webhooks handle async events (e.g., renewals → top-up wallet).
- **Compliance**: PCI DSS via Stripe; audit logs for all transactions; GDPR for consent on billing data.

## 2. Wallet System
- **Core Concept**: User's USD balance for all site consumptions (e.g., API calls, features). Viewable in /account/balance.
- **Operations**:
  - **Display**: Real-time balance (fetched via tRPC); low-balance warnings (<$5).
  - **Top-Up**: Manual recharge via Stripe Checkout ($10/$20/$50 presets; custom amounts). Success → immediate wallet credit + email notification.
  - **Deductions**: On consumption, apply plan discount first, then deduct from balance. Insufficient → block action + recharge prompt.
  - **History**: Transaction log (date, type: top-up/deduct/refund, amount, description); filters (date/type); CSV export.
  - **Ledger**: Double-entry accounting (debits/credits) in DB for reconciliation. Tables: wallet_transactions (id, user_id, type, amount, balance_after, stripe_id).
- **Auto-Topup from Subscriptions**: On renewal, webhook adds plan's monthly USD to wallet (e.g., Small: +$7.99).
- **Refunds/Disputes**: Stripe handles; reverse ledger entry + notification.
- **Admin View**: /admin/wallet – aggregate balances, anomalies (e.g., negative), user-specific audits.

## 3. Subscription (Membership) System
- **Plans**: Three tiers (Small/Medium/Large), configurable in admin.
  - **Small**: $7.99/month, 5% discount, basic entitlements (e.g., standard limits).
  - **Medium**: $19.99/month, 15% discount, advanced features (e.g., priority support).
  - **Large**: $49.99/month, 30% discount, premium (e.g., custom integrations).
  - **Yearly**: 10x monthly price for 12 months usage (e.g., Small: $79.90).
- **Benefits**:
  - **Auto-Topup**: Monthly +plan_price to wallet (yearly: prorated monthly).
  - **Discounts**: Applied to all consumptions (e.g., $10 service → $9.50 for Small).
  - **Entitlements**: Role-based access (e.g., admin tools for Large); JSON-defined in plan config.
- **Management**:
  - **User Side** (/account/billing): View current plan, upgrade/downgrade (proration via Stripe), cancel (end-of-period), Stripe portal link.
  - **Admin Side** (/admin/plans): CRUD plans (name, monthly/yearly USD, auto-topup amount, discount %, entitlements JSON, active toggle). Changes propagate to pricing page.
- **Lifecycle**: Signup → trial (optional) → subscribe → renew (webhook top-up) → cancel/downgrade (graceful end).
- **DB Schema**: subscriptions (user_id, plan_id, status, stripe_id, current_period_start/end); membership_plans (id, name, prices, discount, entitlements).

## 4. Invoices and Reporting
- **Generation**: Stripe auto-creates for subscriptions/top-ups; include line items (e.g., "Monthly top-up: $7.99").
- **User Access** (/account/billing): List (filter date/status), download PDF (Stripe API).
- **Admin Access** (/admin/billing): Search/export (CSV/PDF), refunds, revenue reports (MRR, churn).
- **Taxes**: Stripe Tax integration (auto-calculate based on location); add to invoices.

## 5. Discounts and Rewards Integration
- **Plan Discounts**: Global % off consumptions; applied pre-deduction.
- **Referral Rewards**: Wallet credits (e.g., $5 on friend's first top-up); logged as special transaction type.
- **Promos**: Optional codes for first-month discount (admin-configured); one-time use.

## 6. Security and Monitoring
- **Idempotency**: Webhooks use Stripe event IDs to prevent duplicates.
- **Rate Limiting**: Top-ups limited (e.g., 5/hour via Redis).
- **Audits**: All actions logged (audit_logs: user_id, action, amount, ip).
- **Fraud**: Stripe Radar for suspicious charges; manual review in admin.

## 7. Flows and Gaps
- **Key Flows**: Recharge → consume (with discount) → low balance alert → subscription renew (auto-topup).
- **Missing**: Full ledger implementation; proration for plan changes; multi-currency support (future); automated tax handling.
- **Testing**: E2E for top-up → deduction → invoice download; webhook simulations.

This spec ensures a transparent, flexible billing system: wallet as core, subscriptions as enhancers. Prioritize ledger and webhook setup for completeness.