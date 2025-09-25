# Modern SPA UI/UX Standard (Authoritative)

Scope: Entire app in Next.js App Router. Iconify-only icons. Minimal borders, color-block emphasis. Dark-first, Light as secondary.

1) Principles
- Minimalist functionalism: remove decoration, focus on content and actions.
- Readability: clear hierarchy, generous line-height and letter-spacing.
- Consistency: one set of radii, spacing, typography, colors across all components.
- Flow: interactions and transitions feel fast, natural; avoid heavy animations.

2) Visual System
- Color
  - Modes: Dark-first (default), Light as opt-in.
  - Accent: Single brand accent (blue/green/purple). Use only for primary CTAs, active states.
  - Contrast: Meet WCAG AA for text vs background.
- Shape & Cards
  - Radii: 8–12px standard across inputs/cards/buttons.
  - Cards: Prefer cardized content sections for reuse and modularity.
  - Shadow: subtle, low-opacity; use elevation only for interactive emphasis and layering.
- Typography
  - Font: Inter or SF Pro Text.
  - Scale: H1/H2/H3/Body/Caption; headings bold, body comfortable.
  - Body size: ≥14–16px with 1.5–1.7 line-height; never cramped.

3) Motion
- Duration: 200–400ms standard transitions.
- Hover: slight scale (1.02–1.03) or deepen shadow for cards/buttons.
- Active: micro-press (0.95–0.98).
- Page transitions: fade/slide with low-easing; avoid jank.

4) Interaction Patterns
- Chat-like streams (where applicable): messages scroll vertically; newest in view with auto-scroll controls.
- Input areas: pinned/fixed at bottom when the primary action is text input; keep CTA prominent.
- Immediate feedback: show optimistic states/spinners/toasts for submits, toggles, loading.
- Collapsible content: long sections fold by default; clear expand affordances.
- Notify errors inline with helper text and toast; never silent-fail.

5) UX Guidelines
- Navigation: top appbar or sidebar pinned; clear section hierarchy; breadcrumb when deep.
- Focus content: strip distraction, keep viewport density balanced; avoid edge-to-edge text in wide screens.
- Scrolling: smooth, momentum-friendly; lazy load for long lists; preserve scroll position when possible.
- Reusable modules: Button, Card, Input, Select, Switch, Tabs, Table, EmptyState, Modal/Sheet, Toast.
- Mobile-first: layouts adapt from narrow to wide; touch targets ≥44px.

6) Testing Requirements
- Dark/Light legibility: verify contrast and button visibility in both modes.
- Interaction latency: click-to-feedback under 100–150ms where possible.
- Responsive layouts: verify mobile/tablet/desktop breakpoints; no horizontal scroll unless intended.
- Accessibility: keyboard focus order, skip links, ARIA for dynamic regions; axe audits; screen-reader labels.

7) Iconography
- Iconify only; no emoji as UI components.
- Consistent visual weight; size 16–24px inline, 24–32px in buttons/cards.
- Label critical icons; never rely on icon-only for non-obvious actions.

8) Cross-References
- UI Components System: ./ui-components.md
- Radix UI Component & Accessibility Spec: ./radix-ui.md
- Iconify Policy and Usage Standard: ./iconify.md
- react-use Hooks Policy and Patterns: ./react-use.md
- PandaCSS Rules (tokens/recipes): ../rules/ui/pandacss.mdc
