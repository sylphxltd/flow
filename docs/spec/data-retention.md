# Data Retention Policy

Scope
- Defines how long we retain different data categories and why.

Retention Windows (examples)
- Auth logs (login_activity): 12 months
- Audit logs: 24 months
- Support tickets: 24 months after closure
- Newsletter consent & status: while active + 24 months archive
- Wallet ledger & invoices: at least 7 years (accounting/legal)
- Consents (terms/privacy/cookies): indefinitely for legal proof or until account deletion if allowed by law
- Analytics events: 14–90 days (minimize PII; aggregate where possible)
- Backups: 7–30 days rolling snapshots

Deletion & Anonymization
- Account deletion removes PII and tombstones references; financial records retained and de-identified.
- Scheduled jobs enforce retention windows; logs beyond retention are purged.

Documentation
- Record legal basis per category; update when jurisdictions change.
