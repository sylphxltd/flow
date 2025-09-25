# UI Components System (Radix + PandaCSS + Iconify)

Scope
- Standardizes our component library construction for the Next.js App Router SPA using:
  - Behavior: Radix UI primitives
  - Styling: PandaCSS design tokens and recipes
  - Icons: Iconify-only
- Complements higher-level UI/UX rules and provides concrete composition and API conventions.

Goals
- Accessibility-first components with predictable keyboard/focus behavior out-of-the-box.
- Single visual system: consistent radii, spacing, typography, shadows, and colors across all components.
- Dark-first, Light-ready theming with WCAG AA contrast.
- Composable primitives: keep logic small; allow Slot/asChild to mix anchors, buttons, and links.
- Stable SSR/hydration: avoid DOM measurement before mount; support dynamic imports for heavy overlays.

Design Tokens and Theming
- Colors: surface, surface-muted, fg, fg-muted, accent, success, warning, danger, overlay
- Radii: 8–12px across inputs/cards/buttons
- Spacing scale: 4/8/12/16/24/32px (tokenized; do not hardcode)
- Shadows: subtle, hover-elevated, popover, modal
- Typography: display, h1–h3, body, caption; weights and sizes mapped to tokens
- Motion: 200–400ms durations; ease standard cubic-bezier(0.2,0.8,0.2,1)
- Reduced Motion: respect prefers-reduced-motion; disable nonessential transitions

Conventions
- Variant API: size (sm|md|lg), intent (primary|neutral|success|warning|danger), appearance (solid|soft|outline|ghost|link), state (loading|disabled)
- Icon slots: leadingIcon, trailingIcon; size 16–20px inline, 20–24px in buttons
- Data attributes: expose [data-state], [data-disabled], [data-variant], [data-size] for styling
- Composition: prefer compound component pattern for complex widgets (e.g., Dialog.Root/Trigger/Content)
- asChild: use Radix Slot so Button can render <a>/Next Link without losing styles or a11y
- Forms: always include Label, Description (helper), and ErrorMessage patterns

Components

Button
- Props: size, intent, appearance, loading, disabled, leadingIcon, trailingIcon, asChild
- Behavior: keyboard-activatable; aria-busy when loading; keeps width to avoid layout shift
- Styles: tokens for padding/height by size; focus ring visible; hover scale 1.02–1.03; active 0.98
- States: primary (accent), neutral, success, warning, danger
- Don’t: place icon-only buttons without aria-label/title

Input (TextField)
- Composition: Label + Input + Description + ErrorMessage
- Props: size, invalid, prefix/suffix slots (optional), type (text/email/url/password)
- Behavior: clear focus ring, IME-friendly; invalid shows error text and aria-invalid
- Masks/Validation: use native attrs + schema; debounce async checks 250–400ms
- Password: reveal toggle button with aria-pressed and screen-reader label

Textarea
- Same as Input; auto-resize optional; enforce max length and counter (non-blocking)

Select
- Based on Radix Select
- Keyboard: Arrow navigation, typeahead, Enter to select, Escape to close
- Props: placeholder, disabled, items with value/label/icon
- Mobile: consider Sheet variant when viewport <= sm

Combobox (optional)
- If adopted: Command-based or Radix/ARIA pattern
- Searchable list; clear/submit buttons; empty state; async loading placeholder

Checkbox / RadioGroup / Switch
- Visible labels; group descriptions
- States: checked/unchecked/indeterminate (checkbox); required indicator if necessary
- Switch: use for binary settings; reflect state with [data-state] and aria-checked

Tabs
- Roles: tablist, tab, tabpanel
- Behavior: Arrow keys navigate; selection persistent in URL (optional)
- Style: underline or pill; animated indicator with transform (GPU-friendly)

Accordion / Collapsible
- Height animation with content-visibility where possible
- Multiple or single open; preserve scroll

Dialog / Sheet (Drawer)
- Based on Radix Dialog
- Focus trap, return focus on close; esc to close; backdrop click configurable
- Sizes: sm/md/lg; Sheet uses side transitions with [data-side]
- Accessibility: role="dialog" aria-modal="true" aria-labelledby/aria-describedby

Popover
- Use for small interactive content; avoid complex forms inside when mobile
- Position by side/align; flip/shift; dismiss on outside click/escape

Tooltip
- Non-essential hints; delayed show (300–500ms), instant hide on blur/ESC
- Never replace labels; aria-describedby target

DropdownMenu / ContextMenu
- Items: icon + label + shortcut (optional)
- Submenus with proper arrow nav; separators for grouping

Toast
- Position: bottom-right (desktop) / bottom (mobile)
- Variants: success/info/warning/error
- Auto-dismiss with pause on hover/focus; limit concurrent count

Table / DataList
- Sticky header; sortable columns with indicators
- Row selection (optional) with checkbox; a11y roles for grid when interactive
- Empty State: replace table with card + icon + CTA when 0 items

Card
- Surface token; subtle shadow; header (title, actions), content, footer
- Density: adequate padding; never edge-to-edge text full width

EmptyState
- Iconify icon (32–48px), 1-line summary, primary CTA; optional secondary link
- Do not dead-end; always point user to next action

Navigation (Topbar/Sidebar/Breadcrumb)
- Active state clear; breadcrumbs for deep routes
- Sidebar collapsible groups; preserve state; keyboard navigable

Form Patterns
- Fieldset + Legend for grouped controls
- Required indicator (*) with accessible label "required"
- Inline errors near fields; summary banner on submit failure
- Async submit: button shows loading; prevent double submit; optimistic success when idempotent

Motion
- Hover: scale 1.02–1.03, shadow deepen; Active: 0.97–0.98
- Entrance/Exit: fade/slide 200–400ms; disable when prefers-reduced-motion
- No jarring animation; prioritize responsiveness

Responsive Rules
- Breakpoints: sm/md/lg/xl tokens; container queries optional
- Touch targets ≥44px; scroll areas with inertial scrolling; preserve position between route segments when appropriate

Accessibility Checklist
- Keyboard traversal complete for all focusable elements
- Focus ring visible against both themes
- ARIA roles/labels correctly applied
- Dialogs trap focus; return to trigger
- Tooltips not used as labels; contribute aria-describedby only
- Tables: headers (th scope), caption optional, announcements for sort changes

Performance
- Lazy-load heavy overlays via dynamic import and Suspense fallback
- Avoid measuring DOM in render; measure in effects
- Use CSS transforms and opacity for animations; avoid layout thrash

Testing
- axe: no critical issues per component
- Playwright: keyboard navigation for Dialog/Menu/Tabs/Table
- Visual regression (optional): dark & light snapshots
- Lighthouse: no CLS from late-loading components

Do/Don’t
- Do: use Panda tokens for all themeable values
- Do: rely on data-* attributes from Radix for state styling
- Don’t: ship icon-only without labels; don’t mix filled/outline haphazardly
- Don’t: create bespoke focus styles per component; use standard focus tokens

Cross-References
- UI/UX Standard: ./ui-ux.md
- Radix UI Spec: ./radix-ui.md
- Iconify Policy: ./iconify.md
- PandaCSS Rules: ../rules/ui/pandacss.mdc
- Error & Loading UX: ./error-ux.md
- Forms Standards: ./forms-standards.md
- Accessibility (WCAG): ./accessibility.md
- Design Tokens: ./design-tokens.md