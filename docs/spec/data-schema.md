# Data Schema (Drizzle + PostgreSQL)

Auth & Identity
- users (id, email, email_verified, name, avatar_url, role[user|admin], created_at)
- accounts (Auth.js providers)
- sessions (if used by provider; JWT primary)
- username_history (user_id, username, from_at, to_at); reserved_names table or enum

Security & Logs
- user_security_settings (mfa_enabled, recovery_codes_hash, ... )
- login_activity (user_id, ip, ua, geo, result, at)
- audit_logs (actor_id, action, subject_type, subject_id, metadata, ip, created_at)

Commerce
- membership_plans (name, monthly_price_usd, yearly_price_usd, autotopup_usd, discount_percent, entitlements, is_active)
- subscriptions (user_id, plan_id, stripe_sub_id, status, current_period_start/end)
- invoices (user_id, stripe_invoice_id, amount_due, currency, hosted_pdf_url, created_at)
- wallet_ledger (id, user_id, entry_type[debit|credit], amount_usd, currency=USD, operation_id, reason, created_at)
- wallet_balance (materialized or derived view from ledger)

Invites & Referral
- invites (code, created_by, max_uses, used_count, expires_at, status)
- invite_redemptions (invite_code, user_id, redeemed_at)
- ref_programs (id, active, trigger, reward_type=fixed|percent, amount_usd, percent, window_days, caps, rule_json)
- ref_links (user_id, code, created_at)
- ref_events (link_id, type=click|signup|first_charge|subscription, at, meta)
- ref_rewards (user_id, event_id, amount_usd, status=pending|granted|revoked, at)

Content & Newsletter
- newsletter_subscribers (email, status=pending|active|unsubscribed, consent_version, subscribed_at, unsubscribed_at, token)
- posts (blog/docs), pages, categories (if headless, replace with remote IDs)

Notifications & Support
- notifications (id, user_id, kind, title, body, data, read_at, created_at)
- notification_prefs (user_id, email_booleans, inapp_booleans)
- support_tickets (id, user_id?, email, subject, status, assigned_to, created_at, updated_at)
- support_messages (ticket_id, sender, body, attachments, created_at)

Legal
- consents (id, user_id?, policy_type, version, accepted_at, ip, user_agent)

Indexes & Invariants
- Unique username; reserved words; lowercase normalization
- Idempotency: unique operation_id on wallet_ledger for charges
- Foreign keys with cascade rules; partial indexes on active rows
- Time zones: always timestamptz; store IP as inet

