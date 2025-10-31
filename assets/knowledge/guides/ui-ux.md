---
name: UI/UX Guidelines
description: Modern SPA design patterns, PandaCSS, Radix UI, conversational interfaces
---

# Modern SPA UI/UX

Apply when designing/updating single-page application interfaces. Keep concise, modular, consistent with conversational products (chat-first SaaS).

## Core Principles
- Minimalist functionalism: Remove clutter, highlight primary content/controls
- Balanced readability: Letter-spacing 1.2–1.5, line-height ≥1.5, clear hierarchy
- Global consistency: Reuse tokens for spacing, color, typography, radii
- Perceived fluidity: Transitions <200ms, never block input

## Visual System
- **Color**: Dark backgrounds (#111–#1A1A), optional light mode. One accent for CTAs. WCAG AA contrast ≥4.5:1
- **Shapes**: 8–12px border radius. Cards with subtle shadows (0 1px 3px rgba(0,0,0,0.1))
- **Typography**: Sans-serif (Inter, SF Pro). Bold headings, progressively larger. Body 14–16px, 1.5 line-height

## Micro-Interactions
- Duration: 200–400ms ease-in-out
- Hover: 1.03× scale or deeper shadow
- Active: 0.95–0.98× for tactile feedback
- Page transitions: Fade/slide, prefetch routes (<100ms latency)

## Interaction Patterns
- **Conversational**: Messages top-to-bottom, timestamp/metadata aligned (chat UIs)
- **Input**: Pin primary composer at viewport bottom, minimal controls
- **Feedback**: Visual response on every submit/load/state change (spinners, progress, confirmations)
- **Expandable**: Collapse long sections, keep critical details visible

## UX Guidelines
- Persistent nav (top/sidebar), limit to 5–7 items
- Eliminate distractions: No autoplay, reduce focal points
- Natural scrolling, lazy loading for long lists/media
- Reusable primitives (buttons, cards, inputs) with consistent props
- Mobile-first: Validate 320px, 768px, 1024px breakpoints, identical functionality

## Validation
- Contrast/readability in dark/light (axe-core, Lighthouse ≥90)
- Hover/tap feedback within 50ms
- Responsive layouts on phone/tablet/desktop, adjust spacing/typography for overflow
- Document UI decisions (tokens, components) for reuse
