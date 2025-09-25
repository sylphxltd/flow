# Referral (Wallet Credit Rewards)

Reward Type: Wallet Credit only (USD). No bonus credits/quota.

Triggers (configurable)
- signup
- first_charge (first successful top-up)
- subscription (first active membership)

Reward Policies (per program)
- Fixed amount (e.g., $5) or percentage of first charge (e.g., 10%)
- Eligibility window (e.g., 30 days), per-referrer caps (monthly/total)
- Region/device/email risk controls; denylist/allowlist
- Anti-abuse signals: shared IP/device fingerprint/credit card → flag for review

Entities
- ref_programs (active policy set)
- ref_links (per-user shortcodes; /r/[code])
- ref_events (clicks, signups, first_charge, subscription)
- ref_rewards (granted wallet credits, status, reason)

User Experience
- Account → Referral: show personal link, QR, UTM builder, stats (clicks, signups, rewards)
- /r/[code] resolves and sets attribution (UTM + cookie) → redirects to marketing page
- Attribution: last-click by default (configurable first-click)

Admin
- Manage programs, links, fraud flags
- Search/sort/filter; export analytics (internal)

