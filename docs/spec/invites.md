# Invites

Capabilities
- Create codes with limits (usage count), expiry, scope
- Revoke codes; track redemption history
- Optional per-user invite quotas

Data
- invites (code, created_by, max_uses, used_count, expires_at, status)
- invite_redemptions (user_id, invite_code, at)

Admin
- CRUD invites; audit who issued/revoked; stats

