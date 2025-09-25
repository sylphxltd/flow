# Fraud & Risk Controls

Wallet/Top-up
- Velocity checks: max top-ups per hour/day; card fingerprint constraints (Stripe)
- Geo/IP anomalies; disposable email denylist
- Hold period (optional) for large top-ups before spending

Referral
- Block same IP/device/CC; manual review queue
- Caps per referrer; window days; auto-revoke on confirmed abuse

Chargebacks
- Record disputes; auto-suspend spending until resolved
- Admin tooling to annotate outcomes

