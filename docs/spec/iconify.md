# Iconify Policy and Usage Standard

Scope
- Icon source of truth: Iconify only. No emoji as UI elements. No mixed icon libraries.
- Applies to: all interactive controls (buttons, menus, nav), status indicators, empty states, toasts, tables, and marketing pages.

Goals
- Consistency: one coherent visual language across app.
- Accessibility: icons never the only conveyor of meaning; provide labels, titles, or aria-*.
- Performance: minimal payload via per-icon imports or CDN sprite; deterministic sizing and color via design tokens.

Approved Icon Sets
- Prefer outline/duotone families with consistent stroke widths:
  - lucide, material-symbols, fluent, heroicons (via Iconify collection equivalents)
- Disallow photorealistic or emoji-like styles for functional UI.

Sizing and Layout
- Inline text contexts: 16–20px
- Buttons / Controls: 20–24px (md), 24–28px (lg)
- Cards / Empty states: 32–48px (use semantic tokens)
- Maintain optical balance: align icon baseline with text; use fixed width for menus if needed.

Color and Theming
- Icons inherit currentColor unless explicitly semantic.
- Semantic mapping via tokens:
  - default: color.fg.muted
  - primary/active: color.accent.fg
  - success/warning/danger: color.{success|warning|danger}.fg
  - disabled: color.fg.subtle with 0.5–0.6 opacity
- Dark-first; validate AA contrast against backgrounds.

Usage Patterns
- Icon + Label (preferred): place icon left of label with 8px gap (tokenized spacing).
- Icon-only (allowed only if globally obvious): must include aria-label or title for screen readers.
- Toggle buttons: reflect state via both icon change and aria-pressed; don’t rely on color alone.

Do/Don’t
- Do: import specific icons to enable tree-shaking.
- Do: keep consistent stroke width across a view.
- Don’t: mix filled and outline capriciously within same control cluster.
- Don’t: rely on icon color alone to indicate destructive actions; add text or tooltip.

Performance
- Client:
  - Prefer @iconify/react with per-icon JSON imports (vite/next bundling optimized).
  - Alternatively, pre-bundle a sprite of frequently used icons for below-the-fold avoidance.
- Server/Static:
  - Inline critical above-the-fold icons as SVG with currentColor.
- Lazy areas:
  - Load rarely used icon sets on demand (dynamic import).

Accessibility
- Non-decorative icons: role="img", provide aria-label or aria-labelledby; include title when embedded SVG.
- Decorative icons: aria-hidden="true" and avoid announcing redundant content.
- Tooltips: never replace essential labels; delay show 300–500ms; close on ESC and blur.

Naming and Organization
- Use kebab-case for icon variable/file names, mirroring Iconify collection id:
  - e.g., lucide:search, material-symbols:settings-rounded
- Centralize icon mappings in a single registry (optional), e.g.:
  - search, settings, add, edit, delete, info, warning, error, success, download, upload, copy, external-link, chevron-left/right/up/down, more-vertical/horizontal

Quality Bar
- Visual weight: harmonize stroke/filled balance within a view.
- Optical alignment: adjust viewBox or CSS to center; no clipped edges.
- Contrast: ensure AA; avoid pure gray on dark backgrounds without sufficient luminance.

Testing Checklist
- Icons visible and crisp on 1x/2x/3x DPR.
- Dark/Light modes verified.
- Screen reader announces non-decorative icons correctly.
- No cumulative layout shift due to late icon font/scripts (we don’t use icon fonts).

Cross-References
- Design Tokens: ./design-tokens.md
- Radix UI Spec: ./radix-ui.md
- UI Components: ./ui-components.md
- Modern SPA UI/UX: ./ui-ux.md