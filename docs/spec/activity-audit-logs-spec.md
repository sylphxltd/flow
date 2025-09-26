# Activity and Audit Logs Specifications

## Purpose
Defines user activity tracking and admin audit capabilities for transparency, compliance, and debugging. User-facing for personal review; admin for full oversight. Integrated with all systems (auth, wallet, etc.). Logs are immutable and searchable. Current gaps: No activity table; missing export features; incomplete admin search.

## 1. User Activity Logs (/account/activity)
- **Scope**: Personal events only (non-sensitive): Logins, recharges, deductions, invites sent/accepted, referrals earned, ticket updates, subscription changes.
- **View**: Chronological list (timestamp, type icon, description, details e.g., amount/location); filters (date range, type), search (description), export CSV.
- **Privacy**: No raw IPs/emails; anonymized where possible (e.g., "Login from new device").
- **Retention**: 1 year; auto-purge old entries.

## 2. Admin Audit Logs (/admin/audit)
- **Scope**: All site actions: User events + admin ops (e.g., user ban, plan edit), system (webhook failures).
- **View**: Advanced table (actor user_id/name, action type, target e.g., user_id/resource, timestamp, ip/ua, details JSON, success/fail); full-text search, filters (actor/action/date/type/target), grouping (by user/day), sort (timestamp/action), paginated export (CSV/JSON).
- **Alerts**: Critical failures (e.g., failed top-up) → admin notification.
- **Retention**: 7 years for compliance (GDPR audits); compressed storage for old logs.

## 3. Common Features
- **Event Types**: Standardized (e.g., auth:login, wallet:deduct, referral:credit, admin:ban_user); severity (info/warn/error).
- **Immutability**: Append-only; no edits; blockchain-like hash chaining optional for high security.
- **Real-Time**: Pub/Sub for live feed in admin dashboard; user activity refreshes on events.
- **Compliance**: Include consent checks; export for DSAR (data subject access requests).

## 4. Data Layer
- **Schemas**: 
  - user_activity (id, user_id, type, description, details JSON, timestamp, ip_hash).
  - audit_logs (id, actor_id, action, target_id, details JSON, timestamp, ip, user_agent, success bool).
- **Indexing**: On user_id, timestamp, type for fast queries; partition by date for scale.
- **Triggers**: tRPC middleware logs all mutations; auto-log on key events (e.g., Stripe webhook).

## 5. Integrations
- **Notifications**: High-impact events (e.g., suspicious login) → user/admin alerts.
- **Security**: Logs feed fraud detection (e.g., rapid logins → flag).
- **Reporting**: Admin aggregates (e.g., churn from activity patterns).

## 6. Flows and Gaps
- **Key Flow**: Event occurs → Log entry → User/admin query → Filter/export.
- **Missing**: activity/audit schemas; tRPC queries (getActivity, searchAudit); cron for pruning.
- **Testing**: E2E for log generation → search/export; ensure no PII leaks.

This spec ensures accountable, searchable logging: user empowerment, admin control, legal safety. Prioritize schemas and search for audit readiness.