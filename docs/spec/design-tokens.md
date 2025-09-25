# Design Tokens

Scope: Single source of truth for theming in Dark/Light modes. Used by Tailwind/custom CSS vars.

Color
- Neutral: bg, surface, overlay, border subtle/strong
- Text: primary, secondary, muted, inverse
- Accent: brandAccent (primary CTA), brandAccentHover, brandAccentActive
- Semantic: success, warning, error, info (with bg/text variants)
- Elevation overlays for dark mode

Spacing
- Scale: 2px step (e.g., 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- Component defaults: Section padding-y 32–64; Card padding 16–24; Input height ≥40

Radius
- xs=6, sm=8, md=10, lg=12 (standard); pill for chips

Typography
- Font: Inter/SF Pro
- Scale: H1 32/40, H2 24/32, H3 20/28, Body 16/24, Small 14/22
- Weight: headings 600–700; body 400–500

Shadow
- none / sm / md / lg (dark mode tuned to subtle α)

Icon
- Iconify only; sizes: 16, 20, 24, 32
- Stroke weight consistent across set

