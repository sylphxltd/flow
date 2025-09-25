# Activity Logs (User + Admin Audit)

User "My Activity"
- Top-ups, spends, subscription changes, referral rewards, invites, logins
- Filters: date range, type; export CSV (optional)

Admin Audit Logs
- audit_logs: id, actor_id, action, subject_type, subject_id, metadata (jsonb), created_at, ip
- Search/sort/filter; retention policy
- Immutable append-only; staff-visible only

Login Activity
- login_activity: user_id, ip, user_agent, geo, result (success/fail), at
- UI: "Sessions & Devices" shows current tokens/devices; revoke all

