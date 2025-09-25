# Radix UI Component & Accessibility Specification

Scope
- This document defines how Radix UI primitives are adopted and composed in our Next.js App Router SPA.
- All styling is powered by PandaCSS design tokens (see ../spec/design-tokens.md and ../rules/ui/pandacss.mdc).
- Icons are Iconify-only (see ./iconify.md).
- Components are headless+accessible by default. We layer visual styles via Panda tokens and utility recipes.

Goals
- Accessibility-first: keyboard, screen reader, focus visibility, and ARIA correctness.
- Composability: primitives + our recipes compose into cohesive, reusable components.
- Visual consistency: one set of radii/spacing/typography/shadows, dark-first with light mode parity.
- SPA fluency: 200–400ms transitions, optimistic UI, zero layout shift, smooth hydration.

Adopted Radix Primitives (baseline)
- Slotted/Inputs: Label, Slot, VisuallyHidden
- Forms/Selection: Checkbox, RadioGroup, Switch, Select, Slider, Progress
- Overlays: Dialog, AlertDialog, Popover, Tooltip, HoverCard, Drawer/Sheet (Dialog-based), Toast
- Navigation/Disclosure: Tabs, Accordion, Collapsible, DropdownMenu, ContextMenu, NavigationMenu
- Feedback: Toast, Progress
- Utilities: Portal, Separator, ScrollArea, AspectRatio

Architecture Principles
- Primitive First: Prefer Radix primitives directly, then wrap into our design system components (./ui-components.md).
- Styling via Panda: Never rely on inline styles for themeable parts. Use tokens: color.* spacing.* radii.* shadows.* typography.*.
- Data State Styling: Target Radix state data-attributes (e.g., [data-state='open']) for animations and states.
- Accessible by Default: Require accessible names, roles, and descriptions. Disallow icon-only buttons without aria-label/title.
- SSR/Hydration Safety: All overlay/portal components must avoid measuring DOM before mount; guard with useIsClient where needed.

Theming and Tokens
- Color tokens: map accent/semantic states (primary, accent, success, warning, danger, muted, surface, overlay) to design tokens.
- Radii: 8–12px across buttons, inputs, cards, menus, tooltips.
- Shadows: subtle at rest; increase depth on hover/active per motion rules.
- Density: touch targets ≥44px on mobile; inputs/buttons min height 40–44px.
- Dark-first: ensure AA contrast for foreground on surfaces; validate both dark and light modes.

Motion and Transitions
- Standard durations: 200–400ms for enter/exit, hover 120–180ms.
- Reduced motion: respect prefers-reduced-motion; disable nonessential transitions.
- Scale and fade: hover scale 1.02–1.03; active press 0.97–0.98; dialogs/popovers fade/scale with ease-out.
- Easing: cubic-bezier(0.2, 0.8, 0.2, 1) for general UI; spring for micro-interactions allowed.

Focus and Keyboard
- Always render visible focus ring (theme token) for keyboard users.
- Maintain correct tab order; no tabindex > 0.
- Focus trap for Dialog/Drawer/Popover when open; return focus to trigger on close.
- Escape closes overlay (when safe); Enter/Space activate; Arrow keys navigate lists/menus as per ARIA Authoring Practices.

Portals, Layers, and Scroll Lock
- Overlays use Portal to body; use layer tokens for z-index: header < nav < overlays < toasts < modals < drawers.
- Prevent background scroll on modal open; restore on close.
- Avoid double scrollbars; prefer ScrollArea inside constrained containers.

Data Attributes and State Styling
- Use Radix-applied data attributes:
  - [data-state='open'|'closed'|'on'|'off'|'checked'|'unchecked']
  - [data-disabled] for disabled styling
  - [data-side='top'|'right'|'bottom'|'left'] for popovers/menus
- Animate via these states, not internal component state.

Accessibility Rules
- Name and describe: aria-label or aria-labelledby where text label absent.
- Inputs: ensure label association (Label + htmlFor + id).
- Dialogs: provide aria-describedby for content; role='dialog' with aria-modal='true'.
- Menus: provide roving tabIndex; items are role='menuitem' and respond to keyboard.
- Tooltips: delayed show (e.g., 300–500ms), never replace essential labels; hide on Escape and blur.

Component Patterns (Guidelines)

Buttons
- Use a single Button component (Radix Slot for asChild) with variants: solid, soft, outline, ghost, link.
- Sizes: sm, md, lg; loading state with spinner and aria-busy.
- Icon placement: left/right slots with 16–20px icons.
- Disabled: [aria-disabled='true'] + cursor-not-allowed; maintain contrast.

Inputs
- TextField pattern: Label + Input + Description + ErrorMessage.
- States: default, focus, invalid, disabled; helper/error under field.
- Inline validation: debounce 300ms; never block typing.

Select/Combobox
- Use Radix Select for closed sets; Combobox pattern with Command (if adopted) for searchable sets.
- Keyboard navigation: Arrow keys navigate, typeahead, Enter selects, Escape closes.

Dialog/Sheet
- Dialog content centered, constrained width; use Sheet (Dialog + side transitions) for mobile drawers.
- Close via: X button, backdrop click (configurable), Escape.
- Prevent focus to background; restore focus to trigger on close.

Popover/Tooltip
- Popover for interactive content; Tooltip strictly for non-essential hints.
- Position via side and align tokens; flip and shift as space requires.

DropdownMenu
- Trigger button with icon+label; items support icon+label+shortcut.
- Submenus allowed; separator for grouping.

Tabs/Accordion
- Tabs: underline or pill styles; preserve scroll position on panel change when list tall.
- Accordion: allow single or multiple; animate height with content-visibility for perf.

Toast
- Position bottom-right (desktop) / bottom (mobile); queue max N toasts; auto-dismiss with focus pause.
- Variants: success/info/warning/error with semantics and icons.

Progress/Slider
- Provide valueLabel for screen readers; ensure sufficient contrast and hit area.

Switch/Checkbox/Radio
- Switch for binary settings; Checkbox for multi-select; RadioGroup for exclusive choices with clear labels.

Table
- Use sticky header on long lists; dense mode optional.
- Sort indicators on sortable columns; keyboard focus on cells/rows.
- Empty state card replaces table when 0 items.

NavigationMenu / Sidebar
- Maintain clear active state; collapsible groups.
- Hide labels on xs only with accessible names.

Z-Index Scale (tokens)
- base: 0
- header/nav: 10
- popover/tooltip: 20
- dropdown/menu: 30
- toast: 40
- modal/dialog: 50
- drawer/sheet: 60
- overlay/scrim: 70

Error and Empty States (cross-ref)
- Follow ./error-ux.md for taxonomy and behaviors.
- Empty state = icon + 1-line summary + primary CTA.

Performance
- Avoid measuring DOM pre-mount; gate with isClient hooks.
- Batch state updates; use React.Suspense boundaries for lazy-loaded heavy overlays.
- Use content-visibility and will-change judiciously; prefer CSS transforms for animations.

Testing Checklist
- axe: no critical violations on all primitives in both themes.
- Keyboard: full traversal, trap in Dialog, return focus.
- Screen reader: labels announced, states conveyed.
- Motion: honors prefers-reduced-motion; transitions within 200–400ms.
- Responsiveness: touch targets ≥44px; overlays fit small screens; safe areas respected.

Do/Don’t
- Do: rely on data-* attributes for state styling; rely on tokens; maintain ARIA roles.
- Don’t: ship icon-only actions without aria-label; rely on hover for essential info; break focus order.

Examples (pseudocode for composition)

Button (asChild with Slot)
- Wrap Radix Slot to allow <a> / <button> / Next Link composition
- Apply variants via Panda recipes; expose loading and icon slots.

Dialog with Form
- Trigger <Button>Add</Button>
- <Dialog> with <DialogContent> contains form elements
- Submit provides optimistic UI, disables submit, shows progress feedback, then toast success or inline error.

Select with Iconify
- Trigger shows selected label + icon (if applicable)
- Content list items with Iconify icon left and label right
- Use keyboard typeahead + check icon for selected

Cross-References
- Design Tokens: ./design-tokens.md
- UI Components library conventions: ./ui-components.md
- PandaCSS rules: ../rules/ui/pandacss.mdc
- Modern SPA UI/UX: ./ui-ux.md
- Iconify-only policy: ./iconify.md