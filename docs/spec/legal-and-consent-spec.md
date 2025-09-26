# Legal and Consent Specifications

## Purpose
Defines the legal pages, consent mechanisms, and compliance features for a global SaaS website. Ensures adherence to GDPR, CCPA, PECR, and other privacy laws. All consents are logged for auditability; versioned policies for updates. Current gaps: No explicit consent records in DB; missing granular cookie controls; incomplete banner implementation.

## 1. Legal Pages
- **Static Content**: Rendered as MDX for easy updates; accessible via /legal/* and footers.
  - **Terms of Service (/legal/terms)**: User agreements, usage rules, liability, termination. Include sections on subscriptions, wallet, referrals.
  - **Privacy Policy (/legal/privacy)**: Data collection/processing (e.g., email, IP, transactions), sharing (Stripe/Redis providers), rights (access/delete), retention (e.g., audits 7 years).
  - **Cookie Policy (/legal/cookies)**: Explain types (essential, analytics, marketing), purposes, third-parties (e.g., Google Analytics if used), opt-out links.
- **Versioning**: Each page has a version (e.g., v1.2, date). Updates trigger re-consent prompts for existing users.
- **SEO/Accessibility**: Meta descriptions; readable format (headings, lists); multilingual notice (English only, but future-ready).
- **Admin Management**: /admin/content/legal – Edit MDX source, publish new versions, view acceptance stats.

## 2. Consent Management
- **Core Principles**: Granular, explicit, revocable. Essential cookies always on; others opt-in.
- **Mechanisms**:
  - **Cookie Banner**: On first visit (localStorage check), bottom-fixed: "We use cookies... Accept All / Customize / Reject Non-Essential". Persists choice.
  - **Preference Center (/account/consent)**: Detailed toggles:
    - Essential: Always enabled (auth, security).
    - Analytics: Google Analytics/ similar (usage stats).
    - Marketing: Newsletter, personalized ads, referrals.
    - Functional: Preferences, session replay (if enabled).
    - Save/Revoke: Update + re-scan site (e.g., disable tracking scripts).
  - **Signup Integration**: Mandatory checkboxes: "I agree to Terms & Privacy" + "Allow essential cookies". No consent → block signup.
  - **Updates**: Policy changes → email + in-app prompt to re-accept (/legal/[policy]?version=new).
- **Logging**: All consents recorded in DB for compliance.
  - Table: consents (id, user_id or session_id, policy_type: terms/privacy/cookies/marketing, version, accepted_at, expires_at, ip, user_agent, details JSON: toggles).
  - Granularity: Separate records for each type; revocable (update to rejected).
  - Audit: /admin/audit/consents – Search/export (CSV for DSAR requests); compliance reports (opt-in rates).
- **Revocation**: Users can withdraw anytime (e.g., delete account → purge data); automated (e.g., unsubscribe → marketing consent off).

## 3. Compliance Features
- **GDPR/CCPA**:
  - Data Subject Rights: Access (/account/data-export, future), rectification (profile edit), erasure (support ticket), objection (consent center).
  - Data Processing: Minimal collection; consent basis for marketing; legitimate interest for essential.
  - International: EU data residency if using Neon EU; privacy shield notice.
- **PECR/ePrivacy**: Cookie consent before setting non-essential; clear reject option (no dark patterns).
- **Other**: Age gate if needed (13+); accessibility statement in privacy policy.
- **Third-Party**: Disclose processors (Stripe for payments, Upstash for Redis, Auth.js providers); ensure their compliance.

## 4. Flows and Integration
- **User Flow**: Visit → Banner → Customize/Accept → Consent logged → Site functional. Login → Pre-fill preferences from DB.
- **Admin Flow**: Update policy → Version bump → Broadcast re-consent → Track acceptances.
- **Error Handling**: No consent → Block features (e.g., no newsletter signup); graceful degradation.
- **Testing**: E2E for banner flows, consent toggles, revocation (check script blocking).

## 5. Gaps and Priorities
- **Missing**: consents table/schema; banner component (Radix Dialog); re-consent logic on updates.
- **Incomplete**: No history view in consent center; admin export for audits.
- **Enhancements**: Automated DSAR handling (P1); cookie scanner tool (future).

This spec ensures legal robustness: transparent policies, auditable consents, user control. Prioritize banner and logging for immediate compliance.