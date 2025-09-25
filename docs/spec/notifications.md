# Notifications (Email + In-App)

Email
- Events: top-up success/failure, subscription state changes, invoice ready, referral reward granted, support replies
- Templates with branding; unsubscribe for marketing, not for transactional

In-App Center
- Bell icon with unread badge in app header
- List with pagination; mark read/unread; link to source objects
- Real-time push via Redis Pub/Sub (SSE/WS)

Preferences
- Account → Notifications: toggles per category, email vs in-app
- Store preferences in user_notification_settings

Admin
- Broadcast notices (maintenance/status)
- Rate limit broadcasts; schedule window

