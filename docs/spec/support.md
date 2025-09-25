# Support & Tickets

Public Support Page (/support)
- Contact form (name, email, subject, message)
- Spam control: hCaptcha/reCAPTCHA, rate limiting

Tickets
- support_tickets: id, user_id (nullable), email, subject, body, status (open|pending|closed), assigned_to, created_at, updated_at
- support_messages: ticket_id, sender (user|staff|system), body, attachments, created_at

Admin
- Queue, assign, reply, canned responses, close/reopen
- Email bridge (optional): send/receive via provider to sync to ticket messages

