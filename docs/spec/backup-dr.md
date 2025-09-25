# Backups & Disaster Recovery

Backups
- PostgreSQL: daily snapshots with 7–30 day retention
- Redis: ephemeral; only configuration/state re-hydrates from DB

RPO/RTO
- Target RPO ≤ 24h, RTO ≤ 4h for critical services

Drills
- Quarterly restore tests; document runbooks

