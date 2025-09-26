# UI/UX Specifications for Modern SPA

## Purpose
Ensure the single-page application (SPA) follows a clean, modern style aligned with contemporary trends like OpenAI ChatGPT. Focus on simplicity, modularity, and smooth user experience. Prioritize dark mode with light mode support. All icons must use Iconify exclusively; no emojis allowed. The site is fully English, responsive across devices (mobile, tablet, desktop), and emphasizes color blocks over borders for visual separation.

## 1. Overall Principles
- **Minimalist Functionalism**: Eliminate unnecessary decorations; focus solely on content and functionality.
- **Readability Focus**: Clear typography with appropriate letter spacing and line height for easy scanning.
- **Consistency**: All components adhere to uniform standards for rounded corners (8-12px), spacing, fonts, and colors.
- **Fluidity**: Interactions, transitions, and page switches feel natural and fast; avoid lag or exaggerated animations.
- **Accessibility**: Meet WCAG AA standards for contrast, keyboard navigation, and screen reader compatibility.
- **Performance**: Lazy loading for images/content; smooth scrolling without jank.

## 2. Visual Elements
### (a) Color Scheme
- **Dark Mode Priority**: Primary background: deep gray (#1a1a1a) or black (#0a0a0a); secondary: lighter grays (#2a2a2a). Text: white (#ffffff) or light gray (#e0e0e0).
- **Light Mode Support**: Background: white (#ffffff) or off-white (#f8f9fa); text: dark gray (#333333). Toggle via user preference or system setting.
- **Accent Color**: Single primary accent (e.g., blue #0070f3 or purple #7c3aed) for buttons, links, and highlights. Use sparingly for CTAs.
- **Contrast**: Ensure 4.5:1 ratio for text/background; use tools like Biome for validation.
- **Color Blocks**: Use solid color fills for sections/cards instead of borders; subtle gradients for depth (e.g., #1a1a1a to #2a2a2a).

### (b) Shapes and Cards
- **Rounded Corners**: Standard 8-12px radius for buttons, cards, inputs.
- **Card Layout**: Group content in modular cards with subtle shadows (e.g., 0 1px 3px rgba(0,0,0,0.1)) for elevation; no heavy borders.
- **Shadows**: Soft, low-opacity (e.g., box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)); increase on hover for interactivity.
- **Spacing**: Consistent padding (16-24px inside cards), margins (8-16px between elements); use PandaCSS for theme tokens.

### (c) Typography
- **Fonts**: Sans-serif only (Inter or SF Pro via Google Fonts/CDN).
- **Hierarchy**:
  - H1: 32-48px, bold (font-weight: 700), line-height: 1.2.
  - H2: 24-32px, semi-bold (600).
  - Body: 14-16px, regular (400), line-height: 1.5-1.6.
  - Small text/labels: 12-14px.
- **Readability**: Avoid dense text; max 75 characters per line; ample white space (padding/margin fixes current issues like missing spaces).

## 3. Dynamic Effects
- **Transition Timing**: 200-400ms for all hovers, fades, and slides (e.g., ease-in-out cubic-bezier(0.4, 0, 0.2, 1)).
- **Hover States**: Buttons/cards scale 1.03x or deepen shadow; color shift to accent variant.
- **Active States**: Scale down to 0.95-0.98x for immediate feedback.
- **Page Switching**: Fade-in/out or subtle slide (e.g., via Framer Motion or CSS); no full reloads in SPA.
- **Loading**: Skeleton loaders for async content; spinners only for critical actions.

## 4. Interaction Modes
- **Chat-Style Flow**: For dynamic sections (e.g., notifications, support tickets), use vertical message flow with timestamps/avatars.
- **Input Areas**: Fixed at bottom for forms/chats; prominent submit button with accent color.
- **Immediate Feedback**: Visual cues for inputs (e.g., success/error borders), submissions (toasts via Sonner), and switches (checkmark animations).
- **Expandable Content**: Accordions/foldables for long sections (e.g., terms, logs); default collapsed for cleanliness.
- **Icons**: All from Iconify (e.g., lucide-react integration); consistent size (16-24px), stroke-width 2.

## 5. UX Guidelines
- **Navigation**: Fixed top bar (logo, menu, user avatar) or sidebar for admin/account; mobile hamburger menu. Breadcrumbs for deep pages.
- **Content Focus**: No distracting sidebars/popups; center main content with generous padding (fix current missing margins/padding).
- **Smooth Scrolling**: Native scroll with overflow-auto; lazy load for lists (e.g., logs, invoices).
- **Reusable Components**: Standardize Button, Card, Input, Table, Modal via Radix UI; theme with PandaCSS.
- **Mobile-First**: Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px). Ensure touch targets >=44px.
- **Error Handling**: Friendly messages (e.g., "Insufficient balance? Recharge now"); no console/debug logs visible.
- **Cookie Consent**: Banner on first visit; granular controls in Consent Center.

## 6. Testing Requirements
- **Theme Validation**: Test dark/light readability (contrast checker); toggle without refresh.
- **Interaction Feedback**: Verify all hovers/clicks respond <100ms; no delays in forms/submissions.
- **Device Adaptation**: Responsive tests on iOS/Android/Chrome DevTools; consistent UX (e.g., no horizontal scroll).
- **Accessibility**: Axe audits for ARIA labels, focus order; keyboard-only navigation.
- **Performance**: Lighthouse score >90 (SEO, Performance, A11y); bundle analysis with Biome.
- **Edge Cases**: Low connectivity (offline indicators), screen readers (e.g., NVDA/VoiceOver).

## Missing/Incomplete Areas (Current Site Focus)
- **Layout Issues**: Fix missing padding/margins, text spacing; refactor all pages for card-based structure.
- **Theme**: Implement full dark/light toggle; current is overly dark without option.
- **Icons**: Replace all with Iconify; ensure consistency.
- **Responsiveness**: Verify mobile views (e.g., login page invisible on small screens).
- **Components**: Break into reusable (e.g., WalletCard, NotificationBell) using Radix UI for modals/tooltips.
- **Polish**: Remove debug elements; add subtle animations only where enhancing UX.

This spec ensures a professional, ChatGPT-like SPA: clean, intuitive, and performant.