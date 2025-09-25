# Security Baseline

Auth & Sessions
- Auth.js JWT rotation; Redis denylist for logout/compromise
- Optional WebAuthn/Passkeys for 2FA
- Session device list; revoke single/all

Headers & CSP
- Strict-Transport-Security, X-Frame-Options=DENY, X-Content-Type-Options=nosniff
- Referrer-Policy=strict-origin-when-cross-origin
- Content-Security-Policy: default-src 'self'; script/img/font/media/connect-src allowlists; upgrade-insecure-requests

Input & Abuse
- Rate limits: per-IP and per-user on auth, wallet, support
- hCaptcha/reCAPTCHA for signup/support
- SQLi/XSS protection via frameworks and validation

Secrets & Supply Chain
- Runtime secrets via env; no secrets in repo
- Biome lint; dependency audit; renovate (optional)

Webhooks
- Stripe signed; idempotency keys; replay window checks

