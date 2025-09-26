# Referral System Specifications

## Purpose
Defines the referral program for user growth, rewarding successful invites with wallet credits. Emphasizes anti-abuse measures and admin configurability. Integrated with wallet for USD rewards. Current gaps: No referral tables or tracking; missing anti-fraud logic; incomplete user-facing stats.

## 1. Core Model
- **Reward Type**: Wallet Credit only (e.g., $5 USD on friend's first top-up). Direct, tangible incentive; no quotas/discounts to keep simple.
- **Attribution**: Last-click model (last referrer gets credit); configurable window (e.g., 30 days from click to conversion).
- **Events Triggering Rewards**:
  - Signup (basic, low value or none to prevent spam).
  - First Top-Up (≥$20 threshold → $5 credit).
  - Subscription Start (e.g., +$10 for Medium/Large plans).
- **Double-Sided**: Referrer gets credit; referee gets bonus (e.g., +10% on first top-up: $20 → $22 wallet).
- **Limits**: Per-user cap (e.g., $50/month total rewards); global program limits (admin-set).

## 2. User Experience
- **Generation** (/account/referral): Personal link (e.g., /r/mycode), QR code, share buttons (copy/social). Auto-generates unique code.
- **Tracking**: Stats dashboard: Clicks, signups, conversions, pending/earned rewards (wallet preview).
- **Landing Page** (/r/[code]): Branded invite page; auto-apply code on signup; UTM capture for analytics.
- **Notifications**: Email/in-app on reward earned (e.g., "Friend topped up! +$5 to your wallet").
- **History**: List of referrals (friend username, status, reward amount/date).

## 3. Admin Management (/admin/referral)
- **Program Config**: Global settings: Reward amounts (% or fixed), thresholds, window days, caps, active toggle.
- **Links & Events**: List all referral links; track clicks/events (UTM params); search/filter by user/code.
- **Rewards**: Pending/issued credits table; manual approve/revoke; export for audits.
- **Fraud Detection**: Flags for suspicious (same IP, disposable emails, rapid signups); auto-deny + ban.

## 4. Data Layer
- **Schemas**:
  - ref_links (id, user_id, code, created_at, clicks, utms JSON).
  - ref_events (id, link_id, type: click/signup/topup/sub, user_id, timestamp).
  - ref_rewards (id, referrer_id, referee_id, event_id, amount, status: pending/issued/revoked, stripe_tx if applicable).
- **Integration**: On reward → wallet transaction + audit log. Use Redis for rate limiting (e.g., 10 invites/day).

## 5. Anti-Abuse
- **Validation**: Unique codes; validate referee not referrer; IP/device fingerprinting.
- **Blacklists**: Reserved codes, banned users/emails/IPs (admin-managed).
- **Monitoring**: Thresholds (e.g., >50 invites/week → review); integrate with audit logs.

## 6. Flows and Gaps
- **Key Flow**: Generate link → Share → Friend clicks/signup/top-up → Auto-credit wallet → Notify.
- **Missing**: Full schemas/routers (tRPC: referral.createLink, .claimReward); UTM parsing; fraud scoring.
- **Testing**: E2E for link generation → conversion → credit; abuse simulations (multi-account).

This spec creates a powerful, configurable referral engine: growth-focused, secure, wallet-integrated. Prioritize schemas and anti-abuse for launch.