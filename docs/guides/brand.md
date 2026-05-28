# Brand & Visual Identity

> **Living document** — updated as design decisions are made.

## Brand Overview

- **Store name:** Infograf
- **Tagline:** *TBD*
- **Industry:** IT services & computer store
- **Founded:** 1992
- **Location:** Palermo, Sicily
- **Heritage:** Over 30 years in the IT sector — established, trusted, local expertise
- **Target audience:** TBD (gamers? professionals? businesses? general consumers?)

## Logo

- **PNG file:** `/public/logo.png` — original logo (1200x300px, transparent background)
- **SVG component:** `@/components/infograf-logo` — inline SVG rendered as a React component for theme-aware coloring
- **Behavior:** SVG uses `fill="currentColor"` so the text color adapts via CSS inheritance from the parent element (which has `text-foreground` in dark/light mode). The red accent rect (`#ff0c3c`) is fixed across both themes.
- **No hydration flash** — by using `currentColor` instead of `useTheme()`, the logo renders correctly on first paint without client-side re-render.
- **Legacy SVG file:** `/public/logo.svg` — kept for reference but no longer used in the app (inline component replaces it)

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#ff0c3c` | Buttons, links, active states, accents |
| Primary hover | `#e00a35` | Button hover states |
| Background | `#0a0a0a` | Page background (dark) |
| Foreground | `#fafafa` | Text color (white-ish) |
| Card | `#141414` | Card backgrounds |
| Card border | `#1f1f1f` | Subtle card borders |
| Muted | `#1a1a1a` | Subtle section backgrounds |
| Muted foreground | `#a1a1a1` | Muted text |
| Accent | `#ff0c3c` | Highlight badges, tags, icons |
| Neon glow | `#ff0c3c` | Box-shadow glow effects on interactive elements |
| Border | `#2a2a2a` | General borders |
| Destructive | `#ff1a1a` | Delete/error states |
| Success | `#00ff88` | Stock availability, success |
| Warning | `#ffaa00` | Low stock warnings |

## Typography

- **Heading font:** TBD (Inter is the default shadcn font — good for modern tech)
- **Body font:** TBD (Inter recommended for consistency)
- **Monospace font:** TBD (JetBrains Mono or Fira Code for specs/code)

## Style Direction

**Confirmed:** Modern tech style.
- Clean, professional, tech-forward
- Heritage from 1992 as trust signal, not as "old" styling
- Animated product pages (scroll reveals, parallax) but sober overall layout

## Components

*Design decisions for specific UI elements.*

|| Component | Decision |
||-----------|----------|
|| Theme toggle | Simple click button (no dropdown). Toggles between dark and light. Sun/Moon icons with 300ms rotation + opacity transition. |
|| Buttons | TBD (rounded? square? outline? filled?) |
| Cards | TBD (bordered? shadow? radius?) |
| Inputs | TBD |
| Navigation | TBD |

## Animations & Interactions

*Scroll animations, hover effects, transitions.*

- **Scroll reveals:** TBD (parallax? fade? slide?)
- **Hover effects:** TBD
- **Page transitions:** TBD

---

*Brainstorming starts here.*
