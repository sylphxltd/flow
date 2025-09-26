# Notifications System Specifications

## Purpose
Defines the in-app, email, and push notification framework for user engagement and alerts. Ensures real-time delivery via Redis Pub/Sub, with user preferences for control. Integrated with wallet, referrals, and support. Current gaps: No in-app bell or unread system; missing Pub/Sub setup; incomplete preference storage.

## 1. Core Types
- **In-App Notifications**: Bell icon in top bar (with unread badge count); dropdown list (title, message, timestamp, actions e.g., "View Invoice").
- **Email Notifications**: Transactional (e.g., recharge success, reward earned) + promotional (newsletter, policy updates).
- **Push Notifications** (Optional/P1): Browser/web push for critical alerts (e.g., low balance); opt-in only.
- **Broadcasts**: Admin-sent to all/targeted users (e.g., maintenance notice).

## 2. User Experience
- **In-App Center** (/account/notifications): Paginated list (latest first), filters (all/read/unread/type: billing/referral), mark all read, delete.
- **Preferences** (/account/notifications/preferences): Toggles per type:
  - Billing: Recharge, deductions, invoices.
  - Security: Logins, 2FA changes.
  - Social: Invites, referrals.
  - Marketing: Newsletter, promos.
  - Channel: In-app always; email/push per category.
- **Delivery**: Real-time via SSE/tRPC subscription; fallback polling for older clients.
- **History**: Retain 30 days; auto-archive read items.

## 3. Admin Management (/admin/notifications)
- **Broadcast Tool**: Compose message, target (all/admins/subscribers), schedule, preview.
- **History**: Sent notifications log (recipients, open rates if tracked).
- **Templates**: Pre-defined for common events (e.g., welcome, low-balance).

## 4. Data Layer
- **Schemas**:
  - notifications (id, user_id, type: billing/security/social/marketing, title, message, data JSON, read_at, created_at).
  - notification_preferences (user_id, type, channel: email/push, enabled bool).
- **Events**: Triggers from tRPC (e.g., wallet.deduct → publish 'billing:d deduction'); Redis Pub/Sub for fan-out.
- **Newsletter Integration**: Separate subscribers table; double opt-in; unsubscribe links.

## 5. Integration and Compliance
- **Triggers**: Wallet changes, auth events, referrals, support replies, policy updates.
- **Consent**: Marketing requires opt-in (link to legal/consent); track in consents table.
- **Personalization**: Use user data (e.g., "Hi {name}, your referral earned $5!").
- **Rate Limiting**: Max 10/day per user to prevent spam.

## 6. Flows and Gaps
- **Key Flow**: Event occurs → Publish to Pub/Sub → User subscribes → In-app/email delivery → User marks read.
- **Missing**: notifications table; tRPC subscription procedures; email service (e.g., Resend/Postmark integration).
- **Testing**: E2E for send → receive → mark read; opt-out flows.

This spec enables engaging, controllable notifications: real-time, multi-channel, privacy-focused. Prioritize Pub/Sub and in-app UI for completeness.