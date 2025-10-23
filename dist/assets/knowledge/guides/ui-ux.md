---
name: UI/UX Guidelines
description: Modern SPA design patterns, PandaCSS, Radix UI, conversational interfaces
category: guides
---

# Modern SPA UI/UX Guidelines (AI Instruction)

## Scope
Apply these flow whenever the AI designs or updates single-page application interfaces. Keep outputs concise, modular, and consistent with modern conversational products (e.g., chat-first SaaS).

## Core Principles
- Embrace minimalist functionalism: remove decorative clutter; highlight primary content and controls.
- Prioritize readability: set balanced letter-spacing (1.2–1.5) and line-height (≥1.5) with clear hierarchy.
- Enforce global consistency: reuse shared tokens for spacing, color, typography, and radii across every component.
- Ensure perceived fluidity: transitions must feel instant (<200 ms) and never block user input.

## Visual System
- **Color Strategy**: Default to dark backgrounds (#111–#1A1A), enable optional light mode. Choose one accent hue for CTAs/highlights and maintain WCAG AA contrast (≥4.5:1).
- **Shapes & Cards**: Standardize 8–12 px border radius. Present grouped information in reusable cards with subtle shadows (e.g., 0 1px 3px rgba(0,0,0,0.1)).
- **Typography**: Use sans-serif family (Inter, SF Pro). Headings are bold and progressively larger; body copy sits at 14–16 px with 1.5 line-height. Avoid dense blocks.

## Micro-Interactions
- Transition duration: 200–400 ms ease-in-out.
- Hover states: apply 1.03× scale or deepen shadow for interactive elements.
- Active states: shrink to 0.95–0.98× for tactile feedback.
- Page transitions: prefer fade or slide with preserved context; prefetch routes to keep perceived latency <100 ms.

## Interaction Patterns
- **Conversational Flow**: Render messages top-to-bottom with timestamp/metadata alignment analogous to modern chat UIs.
- **Input Surface**: Pin primary composer at the viewport bottom; keep controls clear and minimal.
- **Instant Feedback**: Trigger visual response on every submit, load, or state change (spinners, progress, confirmations).
- **Expandable Content**: Collapse long sections by default while keeping critical details immediately visible.

## UX Guidelines
- Provide persistent navigation via top bar or sidebar; limit top-level items to 5–7.
- Eliminate distractions: avoid autoplay media and reduce simultaneous focal points.
- Support natural scrolling with lazy loading for long lists or media galleries.
- Build component primitives (buttons, cards, inputs) as reusable modules with consistent props.
- Design mobile-first; validate at 320 px, 768 px, and 1024 px breakpoints, ensuring identical functionality.

## Validation Checklist
- Confirm contrast and readability in both dark and light themes using automated accessibility tools (axe-core, Lighthouse ≥90).
- Simulate hover/tap flows to verify feedback occurs within 50 ms.
- Test responsive layouts on phone, tablet, and desktop; adjust spacing and typography where overflow appears.
- Document UI decisions (tokens, components) so subsequent prompts reuse identical standards.

## Summary Directive
Generate SPAs that feel contemporary, conversational, and effortless. Favor clarity, modularity, and swift feedback to match user expectations set by leading AI-first interfaces.