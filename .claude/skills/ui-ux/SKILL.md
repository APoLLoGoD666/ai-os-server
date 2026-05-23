---
name: ui-ux-pro-max
description: "UI/UX design intelligence for dashboard.html and any frontend work. Provides 10-priority design framework, accessibility rules, style patterns, and pre-delivery quality checklist. Trigger on any frontend, dashboard, design, or style-related task."
trigger: /ui-ux
---

# /ui-ux — UI/UX Design Intelligence

Apex AI OS design authority. Apply these rules whenever touching dashboard.html, any .html/.css, or any JS that renders UI.

---

## 10-Priority Design Framework (in strict order)

### 1. ACCESSIBILITY — CRITICAL
- Color contrast: **4.5:1 minimum** for normal text, 3:1 for large text (18px+ or 14px bold)
- Touch targets: **44×44px minimum**, 8px gap between targets
- Focus visible: every interactive element needs `:focus-visible` outline — never `outline: none` without replacement
- ARIA: icon-only buttons need `aria-label`. Dynamic content updates need `aria-live`.
- Keyboard: all features reachable via Tab, Enter, Space, Arrow keys. No mouse-only interactions.

### 2. TOUCH & INTERACTION — CRITICAL
- Every async operation needs a **loading state** (spinner, skeleton, disabled button)
- Every error needs a **visible message** — never fail silently
- Pressed/active states required: `:active` on buttons, visual feedback within 100ms

### 3. PERFORMANCE — HIGH
- CSS animations: **<300ms** duration, use `transform` and `opacity` only (no layout thrash)
- Images: WebP/AVIF, `loading="lazy"` on below-fold images
- No blocking JS in `<head>` — defer or async

### 4. STYLE CONSISTENCY — HIGH
- All colors, spacing, border-radius via **CSS custom properties** (`--color-primary`, `--spacing-md`, etc.)
- Never hardcode hex values in component styles
- One icon system — don't mix emoji, SVG, and icon fonts

### 5. LAYOUT & RESPONSIVE — HIGH
- **Mobile-first**: design 375px → 768px → 1024px+
- Always include `<meta name="viewport" content="width=device-width, initial-scale=1">`
- No horizontal scroll at any viewport width
- Safe areas: `padding: env(safe-area-inset-*)` for iOS notch/gesture bar

### 6. TYPOGRAPHY — MEDIUM
- Line height: **1.5–1.75** for body, 1.2–1.3 for headings
- Measure: **65–75ch** max-width for reading columns
- Mobile font size: **≥16px** for inputs (prevents iOS zoom), ≥14px for body
- Max 2 font families: 1 system/display + 1 monospace

### 7. ANIMATION — MEDIUM
- Micro-interactions: **150–300ms**, ease-out curve
- Always check `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }
  ```
- Animate transform/opacity only. Never animate width, height, top, left.

### 8. FORMS & FEEDBACK — MEDIUM
- Always use `<label for="id">` — never rely on placeholder alone
- Error messages: below the field, role="alert", red text + icon
- Success: green confirmation, auto-dismiss after 3s or user-dismissible
- Progressive disclosure: show advanced options only when needed

### 9. NAVIGATION — HIGH
- Max **5 primary nav items** — anything more needs grouping
- Preserve scroll position on back navigation
- Active states on current page/section
- No broken back button (don't push history entries without purpose)

### 10. DATA & CHARTS — LOW
- Match chart type to data: line→trends, bar→comparison, pie→proportion (max 5 slices)
- Use colorblind-safe palettes (avoid red+green alone)
- Always provide table fallback for screen readers

---

## Style Glossary (quick picks)

| Style | When to use | Signature |
|-------|-------------|-----------|
| **Minimalism** | Default OS UI | Whitespace, single accent, no decorations |
| **Glassmorphism** | Overlays, modals | `backdrop-filter: blur(12px)`, semi-transparent bg, subtle border |
| **Neumorphism** | Card UI, controls | Soft dual-shadow (`box-shadow: 8px 8px 16px #d1d1d1, -8px -8px 16px #fff`) |
| **Dark Mode** | Voice-first/ambient | `#0d0d0d` bg, `#1a1a1a` cards, accent color pops |
| **Brutalism** | Alerts, emphasis | No border-radius, thick borders, system fonts, high contrast |

---

## Apex Design Tokens (use these in dashboard.html)

```css
:root {
  /* Colors */
  --color-bg: #0d0d0d;
  --color-surface: #1a1a1a;
  --color-surface-raised: #242424;
  --color-border: #333;
  --color-text: #e8e8e8;
  --color-text-muted: #888;
  --color-accent: #7c6cf2;
  --color-accent-hover: #9d90f5;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing (8px base) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Type */
  --font-body: system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', Consolas, monospace;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

---

## Pre-Delivery Checklist

Run this before marking any frontend task complete:

```
[ ] Contrast 4.5:1 — check text on all backgrounds (light + dark)
[ ] Touch targets ≥44px — check all buttons, links, form controls
[ ] Focus visible — Tab through the entire flow, focus must be visible everywhere
[ ] Loading state — every button that triggers async has a loading indicator
[ ] Error state — every form/fetch shows user-facing error message on failure
[ ] Mobile 375px — no horizontal scroll, text readable, buttons tappable
[ ] prefers-reduced-motion — no janky animation for users who've opted out
[ ] Aria labels — icon-only buttons and form controls have labels
[ ] No hardcoded colors — all colors via CSS variables
[ ] No placeholder-only labels — every input has a visible <label>
```

---

## Anti-Patterns (never do these)

- `outline: none` without a custom focus replacement
- `font-size: 12px` on mobile inputs (triggers iOS zoom)
- `position: fixed` without testing iOS safe areas
- Hover-only tooltips/menus (no touch equivalent)
- Emoji as navigation icons (screen readers read them oddly)
- `z-index: 9999` without a comment explaining the stack
- Animations on `width`, `height`, `top`, `left` (triggers layout)
- `pointer-events: none` on interactive children
- Modals without focus trap and Escape key handler
- `user-select: none` on non-interactive text
