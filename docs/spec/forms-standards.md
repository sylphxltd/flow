# Forms Standards

Layout & Spacing
- Single-column forms preferred; group related fields in cards/sections.
- Label above input; helper text beneath; 8–12px vertical spacing.

Validation
- Client-side constraints + server validation; never trust client.
- On submit: disable button, show spinner; re-enable on error.
- Inline errors per-field; summary toast for global failures.

Input Patterns
- Email: type=email, trim/lowercase; block disposable domains if needed.
- Username: lowercase, regex ^[a-z0-9_]{3,20}$; reserved words list; cooldown for rename.
- Password: strength meter; show/hide toggle; paste allowed.
- 2FA: 6-digit code with auto-advance; clipboard paste support.
- Monetary: USD with 2 decimals; prevent invalid characters; thousand separators optional on blur.

Async & Retry
- Debounced async validation (e.g., username availability).
- Save indicators with optimistic UI; retry surfaces on transient errors.

Accessibility
- Labels tied to inputs; aria-invalid on errors; describedby helper/error ids.
- Keyboard order logical; Enter submits; Esc closes dialogs.

Security
- CSRF for form posts where applicable.
- Rate limit sensitive flows (auth, wallet).
