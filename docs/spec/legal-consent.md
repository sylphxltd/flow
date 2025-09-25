# Legal & Consent Management

Pages
- Terms of Service (/legal/terms)
- Privacy Policy (/legal/privacy)
- Cookies Policy (/legal/cookies)
- Cookie Banner + Preferences modal (link from footer and Consent Center)

Consent Logging (Required)
- Table consents:
  - id (uuid), user_id (nullable for anonymous cookie consent), policy_type (terms|privacy|cookies|marketing)
  - version (semver|string)
  - accepted_at (timestamptz), ip (inet), user_agent (text)
- On registration: mandatory checkbox ("I agree to Terms, Privacy, Cookies") with deep links
- Store acceptance with version numbers at signup and when updated
- On policy updates: force re-consent prompt; block critical actions until accepted

Consent Center (Account)
- View history of accepted versions and timestamps
- Manage cookie categories: necessary (locked), analytics (opt-in), marketing (opt-in)
- Marketing consent: newsletter/promo toggle (double opt-in flows in Newsletter module)

Cookie Compliance
- Prior consent for non-essential cookies (EU)
- Granular categories; revocation at any time
- Respect Do Not Track where applicable

Records & Audit
- Admin view to export aggregated consent stats (on request)
- Maintain policy versioning in repo; bump versions on change and trigger re-consent

