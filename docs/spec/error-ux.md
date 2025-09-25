# Error & Loading UX

Taxonomy
- Success: toast "Done", green accent
- Info: toast/snackbar neutral
- Warning: inline banner + toast
- Error: inline message near control + toast; include retry affordance

Patterns
- Loading: skeletons for lists/cards; spinners for single actions
- Optimistic UI: show pending state within 100ms; revert on failure
- Retry: exponential backoff for idempotent operations; "Try again" CTA
- Empty States: icon + 1-line summary + primary CTA; no dead-ends
- Forms: input helper text, error under field, disable on submit, keyboard navigation

