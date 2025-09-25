# RBAC & Permissions

Roles
- user (default)
- admin (first user auto-promoted; can manage users/billing/wallet/reports)

Principles
- Least privilege; backend-enforced checks in tRPC procedures
- Admin actions emit audit_logs entries

Future-proofing
- Potential roles: support, finance (billing-only), content (CMS)
- Feature flags to gate preview features

