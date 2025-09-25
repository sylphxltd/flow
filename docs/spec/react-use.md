# react-use Hooks Policy and Patterns

Scope
- Standardizes how we use react-use in a Next.js App Router, serverless + SSR context.
- Focus on: SSR/hydration safety, performance (debounce/throttle), consent-aware storage, event listeners, and interoperability with Zustand and Radix UI.

Goals
- Predictable SSR: never access window/document during SSR; no hydration warnings.
- Privacy-by-default: storage and tracking gated by user consent.
- Responsive performance: debounce/throttle and passive listeners; avoid layout trashing.
- Consistent UX: loading states, optimistic UI, and error boundaries are uniform.

Approved Hooks (baseline)
- Performance/Timing: useDebounce, useDebouncedCallback, useThrottle, useInterval, useTimeout
- Media/Environment: useMedia, useWindowSize (client-guarded), useMeasure (client-guarded), useIntersection
- Events: useEvent, useEventListener, useClickAway, useKeyboardJs (optional)
- State: usePrevious, useToggle, useSetState, useLatest
- Async: useAsync, useAsyncFn (with cancellation), useMountedState
- Clipboard/Title: useCopyToClipboard (with toast), useTitle
- Sensors: useHover, useMouse, useScroll (client-guarded)
- Storage (consent-aware): useLocalStorage, useSessionStorage

SSR & Hydration Safety
- Never touch browser-only APIs on the server. Wrap usage:
  - Guard with a client flag (e.g., useMountedState or custom useIsClient).
  - Provide SSR-safe initial values.
- Patterns:
  - Window size: initialize with undefined or a conservative default; update on mount.
  - Storage: do not read local/session storage on SSR. Delay until mounted and consent-checked.
  - Media queries: useMedia with a fallback that matches server CSS (avoid double render flicker).
- Example pattern:
  - const isClient = useMountedState();
  - if (!isClient()) return SSR-safe UI fragment; otherwise render interactive piece.

Consent-Aware Storage
- Local/session storage reads/writes require consent checks from Consent Center (marketing/analytics categories).
- Gate flows:
  - No consent → do not persist, or persist to memory only.
  - Consent revoked → purge keys.
- Key naming:
  - app:<scope>:<key> (e.g., app:ui:theme, app:notify:dismissed)
- Schema:
  - Prefer JSON with versioning: { v: 1, data: … }. On version bump, migrate or reset gracefully.

Debounce/Throttle Policy
- User input (search, validation): debounce 250–400ms.
- Resize/scroll listeners: throttle 100–200ms with passive: true.
- Expensive network calls: debounce 400–800ms; flush on blur/submit.
- Always cancel on unmount to prevent state updates on unmounted components.

Event Listeners
- Always opt for passive listeners for scroll/touch when possible.
- useEvent/useEventListener:
  - Attach on mount; detach on unmount automatically.
  - For performance, avoid handlers that close over changing props; wrap with useLatest.
- Click-away:
  - Exclude portaled overlays or set a boundary ref; cooperate with Radix layers.

Async and Cancellation
- useAsync/useAsyncFn:
  - Track loading/error states; expose a cancel method.
  - Guard setState with isMounted or abort controllers to avoid memory leaks.
- Show optimistic UI when safe; fall back to spinner + inline error per Error UX spec.

Window/DOM Measurement
- useMeasure/useWindowSize/useScroll:
  - Client-only; render placeholders on SSR.
  - Avoid forcing synchronous layout reads in render; measure in effects.
  - Prefer ResizeObserver via useMeasure over polling.

Copy to Clipboard
- useCopyToClipboard:
  - On success → show success toast; on failure → show error toast.
  - Never block UI; provide a fallback (selectable text) for older browsers.

Integrating with Zustand
- Keep global state in Zustand; react-use complements component-level concerns.
- Side-effects based on store changes:
  - Subscribe inside effects; avoid rendering loops.
  - Debounce/throttle store-driven side-effects (e.g., autosave).
- Derived selectors:
  - Use shallow compare; memoize selectors to avoid unnecessary renders.

Integrating with Radix UI
- Portals and focus management can affect click-away and intersection observers.
- Use layer-aware boundaries for click-away to not dismiss dialogs/popovers unexpectedly.
- Respect prefers-reduced-motion when hooking into animation frames.

Error Handling & UX
- Always expose loading/error states from async hooks.
- Display inline error near control and toast (per Error UX spec).
- Retry policies: exponential backoff for idempotent operations; show “Try again” CTA.

Security and Privacy
- Do not store secrets/tokens in localStorage/sessionStorage.
- For sensitive flags, prefer HttpOnly cookies (server-managed).
- Respect DNT and Consent Center preferences before enabling analytics-related hooks.

Testing Checklist
- SSR renders without ReferenceError (window/document undefined).
- No hydration mismatches in Next.js (React 18).
- Consent revocation wipes expected keys; storage writes gated correctly.
- Debounce/throttle timings verified in unit tests (fake timers).
- Event listeners cleaned up; no leaks after route transitions.
- Screen-reader experience unaffected by hook-driven dynamic content.

Do/Don’t
- Do: guard browser APIs, cancel async work on unmount, use passive listeners.
- Do: debounce user typing and network actions; throttle layout-affecting handlers.
- Don’t: read/write storage before consent or during SSR.
- Don’t: rely on window size during SSR for critical layout decisions.

Common Patterns (pseudocode)

/useIsClient
- Returns boolean after first client mount to gate client-only UI.

Search with debounce
- useDebouncedCallback to trigger API after 300ms idle; flush on enter/submit.

Sticky header on scroll
- useScroll with throttle; add class data-attribute for CSS transitions.

/useLocalStorage with consent
- Wrap useLocalStorage; no-op if consent missing; migrate on version bump.

Cross-References
- UI/UX Standard: ./ui-ux.md
- Error & Loading UX: ./error-ux.md
- Radix UI Spec: ./radix-ui.md
- PandaCSS Rules: ../rules/ui/pandacss.mdc
- Notifications: ./notifications.md
- Consent & Legal: ./legal-consent.md