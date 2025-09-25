# Subprocessors & Third Parties

This document lists third parties that process data on our behalf, with purposes and data categories.

- Stripe (Payments & Billing)
  - Data: billing identifiers, invoices, subscription metadata
  - Region: varies by account; see Stripe policies
- Postgres (Neon or managed PostgreSQL)
  - Data: application database (encrypted at rest)
- Upstash Redis
  - Data: ephemeral sessions, rate limits, pub/sub messages, streams (non-PII preferred)
- Email Provider (e.g., Postmark/SES/Sendgrid)
  - Data: transactional emails, newsletter campaigns
- Error/Monitoring (e.g., Sentry/Better Stack)
  - Data: error traces, minimal user identifiers
- Object Storage/CDN (if used)
  - Data: media assets

Changes
- Material changes to subprocessors will be reflected here and may require notice.
