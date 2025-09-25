# Wallet, Billing, Membership (Final Model)

Single currency: USD. All consumption charges Wallet USD. Membership is Auto Top-up + Discount + Entitlements. No credits/quota resets.

Membership Plans
- Small ($7.99/mo), Medium ($19.99/mo), Large ($49.99/mo)
- Yearly = 10 × monthly price (12 months service), applied as monthly auto top-up (to reduce refund risk)
- Fields (admin-configurable): name, monthly_price_usd, yearly_price_usd (derived), autotopup_usd, discount_percent, entitlements (JSON), is_active
- First admin: first registered user auto-admin

Mechanics
- On subscription renewal event (Stripe webhook): add autotopup_usd to Wallet
- Discounts: apply member discount to all consumptions first, then deduct Wallet
- Insufficient Wallet: block the action with prompt to top-up
- Manual Top-up: Stripe Checkout; ledger records deposited USD
- Invoices: show and download Stripe PDF in Account → Billing; list and filter in Admin

Consumption Pipeline
- Price source per operation (pre-discount) → apply membership discount → charge wallet
- Idempotent charge with unique operation_id to prevent double charge
- Ledger as immutable double-entry; wallet_balance derives from ledger

Admin
- Manage plans (CRUD, activate/deactivate)
- Global pricing tables and discount policy
- Reconciliation tools and anomaly detection

