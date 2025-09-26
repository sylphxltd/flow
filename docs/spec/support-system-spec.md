# Support System Specifications

## Purpose
Defines the customer support framework, including ticket submission, management, and self-service options. Integrates with notifications and admin panel for efficient resolution. Focuses on reducing support load via FAQ/docs. Current gaps: No ticket schema or form; missing email integration; no priority/assignment logic.

## 1. Self-Service Options
- **FAQ (/faq)**: Expandable Q&A covering common issues (billing, auth, wallet, invites). Searchable; categorized (e.g., Account, Payments).
- **Docs (/docs)**: Detailed guides (e.g., "How to recharge wallet"); integrated search; feedback form per page.
- **Status (/status)**: Real-time system health; incident history to preempt support queries.

## 2. Ticket Submission (/support)
- **Form**: Multi-step (describe issue, category: billing/tech/account, priority: low/medium/high, attachments). Anonymous optional; logged-in auto-fills user data.
- **Categories**: Billing, Technical, Account/Security, Feature Request, Other.
- **Submission**: tRPC mutation → create ticket + auto-response email; notify admin via Pub/Sub.
- **Guidelines**: Rate limiting (3/day); CAPTCHA for anonymous.

## 3. User Ticket View (/account/support or /support/my-tickets)
- **List**: User's open/closed tickets (ID, status, created, last updated); search/filter by status/date.
- **Details**: Thread view (user messages, admin replies, timestamps); add comment/attachment; close request.
- **Notifications**: Email/in-app on replies/status changes.

## 4. Admin Management (/admin/support)
- **Dashboard**: Open tickets count, avg resolution time, top categories; charts (tickets over time, resolution by category).
- **List View**: Paginated table (ID, user, category, priority, status: open/pending/closed, assignee, created); search (user/ID), filters (status/priority/date), sort, bulk assign/close.
- **Ticket Details**: Full thread; reply form (internal notes private); assign/re-prioritize; integrations (link to user profile, wallet tx).
- **Analytics**: Resolution metrics, user satisfaction (post-close survey), common issues report.

## 5. Data Layer
- **Schemas**: support_tickets (id, user_id, category, priority, status, assignee_id, created_at, updated_at); ticket_messages (id, ticket_id, author_id, message, attachment_url, is_internal, timestamp).
- **Integrations**: Auto-link to related data (e.g., billing ticket → subscription ID); audit logs for actions.

## 6. Integrations and Compliance
- **Email Sync**: Incoming replies via webhook/IMAP to new messages; outgoing via SMTP.
- **Notifications**: Pub/Sub for new/reply events; user prefs control delivery.
- **Privacy**: Tickets contain PII → consent check; retention 1 year post-close; export/delete on request.
- **Escalation**: High priority auto-assign to admins; SLA (e.g., 24hr response).

## 7. Flows and Gaps
- **Key Flow**: Submit ticket → Admin assign/reply → User respond → Close + survey.
- **Missing**: tickets schema; tRPC procedures (createTicket, replyTicket); email service integration (e.g., Resend).
- **Testing**: E2E for submit → reply → close; multi-user threads.

This spec builds a responsive support system: self-service first, ticket-based escalation. Prioritize form and schema for user trust.