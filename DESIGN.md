---
name: Life Log
description: Thai-first personal journal — fast, clean, simple daily logging with mood tracking
colors:
  bg: "#f8f7f4"
  card: "#ffffff"
  ink: "#1a1a18"
  muted: "#8a8278"
  accent: "#5b6b7f"
  accent-hover: "#4a5a6a"
  accent-soft: "#eef1f4"
  line: "#e8e4de"
  success: "#4a8a5a"
  danger: "#b33"
  dark-bg: "#121110"
  dark-card: "#1e1c1a"
  dark-ink: "#e8e3db"
  dark-muted: "#8a847c"
  dark-accent: "#8aa0b4"
  dark-accent-soft: "#252320"
  dark-line: "#2a2825"
  sepia-bg: "#f5f0e6"
  sepia-card: "#fffcf5"
  sepia-ink: "#4a3f35"
  sepia-muted: "#7a6f60"
  sepia-accent: "#7a6a52"
  forest-bg: "#f2f5f0"
  forest-ink: "#2a3a2a"
  forest-accent: "#4a7a4a"
  ocean-bg: "#f0f4f8"
  ocean-ink: "#2a3a48"
  ocean-accent: "#4a6a88"
typography:
  display:
    fontFamily: "Sarabun, Noto Sans Thai, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.35rem, 3vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Sarabun, Noto Sans Thai, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Sarabun, Noto Sans Thai, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
  pill: "100px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 32px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "0"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "18px 20px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
---

# Design System: Life Log

## 1. Overview

**Creative North Star: "The Daily Breath"**

Life Log is a journaling tool that should feel like exhaling — effortless, grounding, routine. The interface exists to disappear. When you open the app, the writing surface is already there. When you close it, the data is already saved. No ceremony, no loading states, no learning curve.

The system rejects the complexity of Notion and the feature bloat of Day One. There are no nested databases, no multimedia sidebars, no onboarding tutorials. Five themes carry the emotional range; the layout carries none. Thai is the primary language, but the structure never breaks for non-Thai text.

**Key Characteristics:**
- Centered, single-column layout (680px max) — one focus, one task
- Five nature-inspired themes with a shared neutral backbone
- Minimal shadow vocabulary — flat at rest, lift only on interaction
- 44px minimum touch targets — mobile-first, always
- Typography constrained to one family (Sarabun) in three weights

## 2. Colors

The palette is restrained: tinted neutrals with one cool-steel accent. Warmth comes from the background tints, not from saturated color.

### Primary
- **Quiet Steel** (`#5b6b7f`): The accent. Used on save buttons, active states, links, focus rings, and the topbar title highlight. Its muted quality keeps the interface calm; its coolness distinguishes it from the warm neutrals.

### Neutral
- **Warm Parchment** (`#f8f7f4`): The light-mode body background. Slightly warm, never cream.
- **Clean White** (`#ffffff`): Cards, modals, and elevated surfaces.
- **Deep Ink** (`#1a1a18`): Body text, headings. Near-black with warm undertone.
- **Stone Gray** (`#8a8278`): Secondary text, placeholders, timestamps. Warm enough to not feel cold, muted enough to recede.
- **Warm Line** (`#e8e4de`): Dividers, borders, card outlines. Barely there.

### Semantic
- **Leaf Green** (`#4a8a5a`): Success toasts, positive indicators.
- **Brick Red** (`#b33`): Danger actions, error states, delete buttons.

### Theme Variants
Each theme overrides the same CSS custom properties. The accent shifts hue to match the theme's character (slate for light/dark, amber for sepia, green for forest, teal for ocean). The neutral backbone stays consistent across all five.

### Named Rules
**The Quiet Steel Rule.** The accent is used on ≤15% of any given screen. Its restraint is the point. When in doubt, use muted gray; the accent earns its presence by appearing only on interactive elements and active states.

## 3. Typography

**Display Font:** Sarabun (with Noto Sans Thai, system fallbacks)
**Body Font:** Sarabun (with Noto Sans Thai, system fallbacks)

**Character:** A single Thai-first sans-serif in three weights (400/600/700). The typeface is clean, legible at small sizes, and avoids the geometric stiffness of system fonts. No display font, no serif, no mono. One family, done well.

### Hierarchy
- **Display** (700, `clamp(1.35rem, 3vw, 2.2rem)`, line-height 1.2, letter-spacing -0.03em): The topbar title and auth logo. The only place large type appears.
- **Title** (700, 1.15rem, line-height 1.3): Modal titles, sidebar headings.
- **Body** (400, 16px, line-height 1.6): Journal entries, form labels, descriptions. Max line length 65ch.
- **Small** (600, 0.85rem, line-height 1.4): Filter chips, stat pills, tags. Used for secondary UI.
- **Micro** (600, 0.75rem, line-height 1.4, letter-spacing 0.05em, uppercase): Day labels, section eyebrows, meta labels. Used sparingly.

### Named Rules
**The One Weight Rule.** Body text is always weight 400. Weight 600 is reserved for labels and small UI text. Weight 700 appears only in display and title contexts. Never use bold for emphasis in body copy; use the accent color or structural hierarchy instead.

## 4. Elevation

Flat by default. Shadows appear only as a response to state (hover, focus, active). The shadow scale is subtle: `--shadow-xs` (resting cards) through `--shadow-lg` (sidebar, modals). The `--shadow-glow` ring (3px accent blur) handles focus states. No drop shadows on static elements. Depth is communicated through background color shifts (card vs. body) and border presence, not through shadow.

### Shadow Vocabulary
- **Resting card** (`box-shadow: 0 1px 2px rgba(0,0,0,.03)`): Barely there. Applied to entries, stat pills at rest.
- **Hover lift** (`box-shadow: 0 2px 8px rgba(0,0,0,.06)`): Appears on entry hover, card hover.
- **Focused element** (`box-shadow: 0 0 0 3px rgba(91,107,127,.15)`): Accent glow ring on input/button focus.
- **Elevated surface** (`box-shadow: 0 4px 20px rgba(0,0,0,.08)`): Composer, auth card.
- **Overlay** (`box-shadow: 0 8px 40px rgba(0,0,0,.12)`): Sidebar, modal.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus). A card that has a shadow at rest has too much shadow.

## 5. Components

### Buttons
- **Shape:** Gently curved (`12px` radius for primary/full-width, `8px` radius for icon/small)
- **Primary (`.save-btn`, `.auth-submit`):** Accent background (`#5b6b7f`), white text, full-width, `12px 32px` padding, 48px min-height. Transitions with `--ease-out`. On hover: -2px translateY, deeper shadow. On press: scale to 0.95.
- **Icon (`.icon-btn`):** Transparent background, muted text, 44px×44px. On hover: accent-soft background, ink text.
- **Ghost (`.filter-chip`, `.theme-dot`):** Border only, pill radius (`100px`). On hover: accent border. Active state: accent background, white text.
- **FAB:** Circular (50%), accent background, white text, fixed bottom-right. Springy hover (`--ease-spring`).

### Cards / Containers
- **Entry card:** White background, 1px warm-line border, `12px` radius, `xs` shadow. On hover: accent border, `sm` shadow, -2px translateY lift.
- **Composer:** White background, 1px border, `20px` radius, `sm` shadow. On focus-within: accent border + glow ring.
- **Auth card:** White background, 1px border, `20px` radius, `md` shadow. Centered, 400px max.

### Inputs / Fields
- **Text input / Select:** Warm parchment background, 1px line border, `8px` radius, 44px min-height. On focus: accent border + glow ring.
- **Textarea (composer):** Borderless, transparent background, inherits body typography. Focus is handled by the parent composer container.
- **Search box:** White background, 1px line border, `12px` radius. On focus: accent border + glow ring.

### Chips / Tags
- **Filter chip:** White background, 1px line border, pill radius, 40px min-height. Active: accent background, white text, glow shadow.
- **Tag:** Transparent background, accent border + accent text, pill radius. On hover: accent-soft background.
- **Entry folder badge:** Accent-soft background, 1px line border, pill radius, micro font.

### Navigation
- **Sidebar:** Fixed left, 280px width, white background, `lg` shadow. Slides in via `transform: translateX` with `--ease-out`. Overlay: 40% black, 4px backdrop blur.
- **Topbar:** Sticky top, parchment background, 1px line border bottom. Hamburger + title + icon actions.
- **Modal:** Centered on desktop, bottom-sheet on mobile (<600px). White background, `20px` radius, `lg` shadow, backdrop blur.

### Calendar
- **Grid:** 7-column CSS grid, 1px line borders, `12px` radius. Day cells: 76px min-height, hover accent-soft. Today: accent circle. Selected: inset accent border.

### Toast
- Fixed bottom-center, pill radius, `md` shadow. Three variants: success (green), error (red), info (muted). Auto-dismiss with slide-up exit.

### Empty State
- Centered, muted text, large emoji (3rem), 60px vertical padding.

## 6. Do's and Don'ts

### Do:
- **Do** keep the accent on ≤15% of any screen. Its rarity is the point.
- **Do** use 44px minimum for all interactive targets. Mobile-first means thumb-first.
- **Do** use `--ease-out` (cubic-bezier 0.16, 1, 0.3, 1) for all state transitions. Reserve `--ease-spring` for the FAB and mood selection only.
- **Do** show the writing surface immediately on app load. No splash, no loading, no onboarding gate.
- **Do** use the accent color only on interactive elements (buttons, active states, focus rings, links). Never on static text or decorative elements.
- **Do** maintain the 680px centered column. The journal is a single column, never a multi-panel layout.

### Don't:
- **Don't** add complexity like Notion's nested databases, template systems, or multi-panel layouts. This is a journal, not a workspace.
- **Don't** add feature bloat like Day One's multimedia sidebar, location tagging, or weather widgets. Every feature must prove it reduces friction.
- **Don't** use shadows at rest on cards. The flat-by-default rule is non-negotiable.
- **Don't** pair `border: 1px solid` with `box-shadow` on the same element for decoration. Pick one, never both as decoration.
- **Don't** use border-left or border-right greater than 1px as a colored accent. Rewrite with full borders, background tints, or nothing.
- **Don't** use gradient text (`background-clip: text`). Use a single solid color.
- **Don't** add em dashes. Use commas, colons, semicolons, periods, or parentheses.
- **Don't** add marketing buzzwords (streamline, empower, supercharge, leverage, seamless). Pick a specific noun and a verb that describes what the product literally does.
- **Don't** use `border-radius` greater than 28px on cards or sections. Full-pill is reserved for tags and buttons only.
- **Don't** animate layout properties unless truly needed. Transform and opacity only.
- **Don't** use `repeating-linear-gradient(...)` stripe backgrounds. Ever.
