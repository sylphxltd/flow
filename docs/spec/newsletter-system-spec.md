# Newsletter System Specifications

## Purpose
Defines the email newsletter subscription, management, and delivery system for marketing and updates. Double opt-in for compliance; integrated with consent and notifications. Tracks engagement for admin insights. Current gaps: No subscribers table; missing double opt-in flow; no send analytics.

## 1. Subscription Model
- **Double Opt-In**: Signup form (email + name optional) → Confirmation email with link → Verify → Add to list. Prevents spam signups.
- **Placement**: Footer signup, /pricing CTA, post-registration prompt (if marketing consent given).
- **Unsubscribe**: Every email footer link; one-click → Immediate removal + confirmation.
- **Consent Link**: Requires marketing consent (/account/consent); revocable.

## 2. User Experience
- **Signup (/newsletter or inline form)**: Simple form; success message + "Check email to confirm". Error handling (e.g., duplicate).
- **Management (/account/notifications or /account/newsletter)**: View subscription status, change email, unsubscribe history.
- **Preferences**: Toggle frequency (weekly/monthly) or topics (product updates, tips).

## 3. Admin Management (/admin/newsletter)
- **Subscribers List**: Paginated table (email, name, subscribed_at, status: active/unconfirmed/unsubscribed, last engaged); search/filter (status/date), export CSV, bulk actions (delete/tag).
- **Compose/Send**: WYSIWYG editor (templates: welcome, update, promo); preview, test send, schedule; target (all/active/segment: plan type).
- **Analytics**: Open/click rates, unsubscribe rate, top links; charts (sends over time, engagement by campaign).
- **Templates**: Pre-built (e.g., billing alert, referral promo); custom HTML/MDX.

## 4. Data Layer
- **Schemas**: newsletter_subscribers (id, email, name, status: pending/active/unsubscribed, subscribed_at, confirmed_at, unsubscribe_at, consent_version); campaigns (id, subject, content, sent_at, total_sent, opens, clicks); sends (id, campaign_id, subscriber_id, opened_at, clicked_links JSON).
- **Integrations**: tRPC for signup/confirm; email service (Resend/Postmark) for delivery; webhook for bounces/unsubscribes.

## 5. Compliance and Best Practices
- **GDPR**: Opt-in only; easy unsubscribe; data minimal (email + consent); export/delete on request.
- **CAN-SPAM**: Physical address in footer; no misleading subjects.
- **Segmentation**: Tag by plan/source for targeted sends (e.g., Large plan users get premium tips).
- **Rate Limiting**: Max 1 signup/hr per IP; send limits (e.g., 1000/day).

## 6. Flows and Gaps
- **Key Flow**: Signup → Opt-in email → Confirm → Active; Send campaign → Track opens/clicks → Unsubscribe.
- **Missing**: subscribers schema; tRPC (subscribeNewsletter, sendCampaign); email provider integration.
- **Testing**: E2E for opt-in → send → unsubscribe; analytics accuracy.

This spec enables compliant, engaging newsletters: opt-in focused, trackable, user-controlled. Prioritize double opt-in and admin send tool for marketing readiness.