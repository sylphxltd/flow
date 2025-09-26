# Auth and Security Specifications

## Purpose
Outlines authentication, session management, and security features for a secure SaaS SPA. Emphasizes stateless JWT with Redis support, MFA, and auditability. Compliant with OWASP top 10. Current gaps: No MFA implementation; incomplete session denylisting; missing login activity logs.

## 1. Authentication Flow
- **Providers**: Primary: Email/Password (Credentials). Optional: OAuth (Google, GitHub) for social login.
- **Signup (/auth/signup)**: Email, password (hashed with bcrypt/Argon2), username (validated), terms/privacy consent checkboxes. Email verification required; auto-admin for first user.
- **Login (/auth/login)**: Email/password + 2FA if enabled. Rate-limited (5 attempts/5min via Redis).
- **Password Reset (/auth/reset)**: Email token (expires 1hr), new password form; notify on changes.
- **Verification (/auth/verify)**: Email link; resend with cooldown.
- **Logout**: Invalidate JWT via Redis denylist; clear client cookies.

## 2. Session Management
- **Stateless JWT**: Auth.js with short-lived tokens (15min access, 7d refresh). Rotation on use; denylist in Redis for logout/revoke.
- **Sessions Table**: sessions (id, user_id, expires_at, ip, user_agent); prune expired via cron.
- **Devices (/account/sessions)**: List active (IP, location via GeoIP, last active); logout individual/all.
- **Login Activity**: Log all attempts (success/fail) in login_activity (user_id/email, ip, ua, timestamp, status).

## 3. Multi-Factor Auth (MFA)
- **Setup (/account/security)**: TOTP (e.g., Google Authenticator QR); backup recovery codes (12x single-use).
- **Enforcement**: Optional but prompted for high-risk (e.g., password change, new device).
- **Backup**: Email codes as fallback; revoke on device loss.

## 4. Security Features
- **Password Policy**: Min 12 chars, complexity (upper/lower/number/symbol); no reuse (check history).
- **Rate Limiting**: All auth endpoints (Redis: login 5/5min, signup 3/hr).
- **CSRF/XSS**: tRPC CSRF protection; sanitize inputs (Zod); CSP headers.
- **2FA Recovery**: Security questions or email; cooldown on failed attempts.
- **Alerts**: Email on suspicious logins (new IP/location); configurable in preferences.
- **Role-Based Access**: Users (default), Admin (first user auto); middleware in tRPC for gates.

## 5. Data Layer
- **Schemas**: users (id, email, password_hash, username, role, mfa_secret, created_at); accounts (user_id, provider); verification_tokens.
- **Audits**: All auth events to audit_logs (action: login/signup, user_id, ip, success).

## 6. Flows and Gaps
- **Key Flow**: Signup → Verify → Login → 2FA → JWT → Protected route.
- **Missing**: MFA TOTP integration (e.g., speakeasy); geo-location for sessions; brute-force lockout.
- **Testing**: E2E for full auth cycle, failed logins, token expiry.

This spec ensures robust, user-friendly security: stateless, multi-layered, auditable. Prioritize MFA and logging for compliance.