# Design Brief: Premium Modern UI Patterns
## Analysis of aura.build and 21st.dev

---

## 1. AURA.BUILD -- Design Analysis

### Overview
Aura.build is an AI landing page builder by Meng To (Design+Code). It uses a **clean, minimal, light-first design** built on the **Geist design system** (Vercel's open-source design language). The overall aesthetic is spacious, confident, and tool-oriented -- it feels like a premium creative instrument.

### 1.1 Color Palette

**Light Mode (Primary)**

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `0 0% 9%` | `#171717` | Primary text |
| `--card` | `0 0% 98%` | `#FAFAFA` | Card surfaces |
| `--muted` | `0 0% 96%` | `#F5F5F5` | Muted backgrounds |
| `--muted-foreground` | `0 0% 45%` | `#737373` | Secondary text |
| `--border` | `0 0% 90%` | `#E6E6E6` | Borders |
| `--destructive` | `0 84% 60%` | `#EF4444` | Error/destructive |
| `--ring` | `0 0% 20%` | `#333333` | Focus rings |
| Body background | - | `rgb(250,250,250)` | Actual `<body>` bg |

**Dark Mode**

| Token | Value | Usage |
|-------|-------|-------|
| `--geist-background` | `#000000` | Pure black bg |
| `--geist-foreground` | `#FFFFFF` | Pure white text |
| `--accents-1` | `#111111` | Lightest dark surface |
| `--accents-2` | `#333333` | Borders in dark |
| `--accents-3` | `#444444` | Subtle borders |
| `--accents-5` | `#888888` | Secondary text |
| `--accents-7` | `#EAEAEA` | High-contrast text |

**Key insight**: Aura uses an achromatic (grayscale) palette. There is almost zero chromatic color in the UI shell. Color comes exclusively from user-generated content (the template thumbnails). This creates maximum visual contrast between the tool and the work.

### 1.2 Typography

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Body | Geist (fallback: Inter) | 16px | 400 | normal | normal |
| H1 (hero) | Geist | 48px | 600 | 48px (1:1) | **-2.4px** |
| H3 (section) | Geist | 32px | 600 | 40px | -1.28px |
| Paragraph (hero) | Geist | 12-18px | 400 | 16-28px | normal |
| Nav links | Geist | 14px | 400 | - | normal |
| Buttons | Geist | 14px | 500 | - | normal |
| Footer headings | Geist | varies | 600 | - | - |

**Actual font stack**: `Geist, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`

**Key typography patterns**:
- Extremely tight letter-spacing on headings (`-2.4px` at 48px = -5% tracking)
- 1:1 font-size-to-line-height ratio on H1 (48px/48px) -- multi-line headlines feel compact
- Geist is Vercel's proprietary geometric sans-serif, refined from Inter with more personality
- ALL CAPS display text for nav links is rendered as content (not CSS text-transform)
- Body text at regular weight (400) -- clean and unassuming
- Section headings at semibold (600) with consistent tight tracking

### 1.3 Spacing System (Geist Scale)

The site uses a **4px base unit** spacing system:

| Token | Value | Common Usage |
|-------|-------|--------------|
| `--geist-space` | 4px | Base unit |
| `--geist-space-2x` | 8px | Tight gaps |
| `--geist-space-3x` | 12px | Small padding |
| `--geist-space-4x` | 16px | Standard padding |
| `--geist-space-6x` | 24px | Gap between items |
| `--geist-space-8x` | 32px | Section gap |
| `--geist-space-16x` | 64px | Large section spacing |
| `--geist-space-24x` | 96px | Major section breaks |
| `--geist-space-gap` | 24px | Default content gap |
| `--geist-page-width` | 1200px | Max content width |
| `--ds-page-width` | 1400px | Extended content width |
| `--geist-page-margin` | 24px | Horizontal page padding |
| `--geist-radius` | 6px | Default border radius |
| `--geist-marketing-radius` | 8px | Marketing components |
| `--radius` | 0.5rem (8px) | shadcn/ui radius |
| `--header-height` | 64px | Header height |

### 1.4 Card / Component Patterns

**Template cards**:
- `border: 1px solid rgb(235, 235, 235)` (very subtle)
- `box-shadow: rgba(0, 0, 0, 0.04) 0px 2px 2px` (barely perceptible)
- `border-radius: 0px` (sharp corners on cards -- unusual and distinctive)
- No padding on the card container itself
- Image fills the card, text sits below

**Prompt input area**:
- Large textarea with per-character animated placeholder text
- Rounded container (`border-radius: 12px` on buttons)
- Tool buttons arranged in a horizontal row below the input
- Each tool button: `border-radius: 12px`, `padding: 4px`, ghost styling (transparent bg)
- The overall prompt area is visually separated by a subtle background shift

**Shadow system (layered approach)**:
```css
--ds-shadow-small:        0px 2px 2px rgba(0,0,0,0.04)
--ds-shadow-medium:       0px 2px 2px rgba(0,0,0,0.04), 0px 8px 8px -8px rgba(0,0,0,0.04)
--ds-shadow-large:        0px 2px 2px rgba(0,0,0,0.04), 0px 8px 16px -4px rgba(0,0,0,0.04)
--ds-shadow-border:       0 0 0 1px rgba(0,0,0,0.08)  (combined with above)
--ds-shadow-modal:        border + 1px blur + 16px blur + 32px blur (4 layers)
```

### 1.5 Navigation

- **Header**: Height `64px`, horizontal padding `24px`, transparent background
- **Nav links**: ALL CAPS content text, 14px, gray (`#4D4D4D`)
- **Theme toggle**: 3-state toggle (Light / System / Dark) using icon buttons, grouped inline
- **SIGN IN**: Ghost button style, same as nav links but distinct as a CTA
- **Position**: Static (not fixed/sticky)

### 1.6 Button Styles

| Variant | Background | Text | Border | Radius | Padding |
|---------|-----------|------|--------|--------|---------|
| Primary (CTA) | `#171717` (near-black) | White | none | 8px | 8px 16px |
| Secondary | transparent | `#171717` | `1px solid #E6E6E6` | 8px | 8px 16px |
| Ghost/Icon | transparent | `#171717` | none | 12px | 4px |
| Pill/Badge | `rgba(0,0,0,0.05)` | `#737373` | none | 9999px | 4px 12px |

### 1.7 Dark Theme Strategy

Aura uses **Vercel's Geist dark mode** which inverts to pure black:
- Background: `#000000` (true black, not dark gray)
- Foreground: `#FFFFFF`
- Borders switch from subtle shadows to `1px solid #333` (or ring-style using `0 0 0 1px` box-shadow)
- All drop shadows become **1px ring outlines** (`0 0 0 1px var(--accents-2)`)
- This is a key pattern: **in dark mode, shadows are replaced with border-like rings**

### 1.8 Motion / Animation

- `--ds-motion-timing-swift`: `cubic-bezier(.175, .885, .32, 1.1)` (slight overshoot)
- `--ds-motion-overlay-duration`: `0.3s`
- `--ds-motion-popover-duration`: `0.2s`
- `--ds-motion-overlay-scale`: `0.96` (scale-in from 96%)
- Per-character text animation on the hero heading and placeholder text

### 1.9 What Makes It Feel Premium

1. **Achromatic palette** -- the tool disappears, content shines
2. **Extreme typographic confidence** -- -2.4px letter-spacing, regular body text, 1:1 line-height
3. **Nearly invisible UI chrome** -- borders at 4% opacity, ghost buttons
4. **Generous whitespace** -- the hero section is mostly empty space
5. **Template gallery as hero** -- the user's potential work is the centerpiece
6. **Per-character text animation** -- subtle motion that signals craft

---

## 2. 21ST.DEV -- Design Analysis

### Overview
21st.dev is a community-driven UI component library (shadcn/ui ecosystem). It uses a **sidebar-based app layout** with a clean white background and card-based component previews. The design language is functional, developer-focused, and relies on the shadcn/ui design token system.

### 2.1 Color Palette

**Light Mode**

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `222.2 84% 4.9%` | `#020817` | Primary text (dark blue-black) |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `--primary` | `221.2 83.2% 53.3%` | `#3B82F6` | Primary blue accent |
| `--primary-foreground` | `210 40% 98%` | `#F8FAFC` | Text on primary |
| `--secondary` | `210 40% 96.1%` | `#F1F5F9` | Secondary backgrounds |
| `--muted` | `210 40% 96.1%` | `#F1F5F9` | Muted backgrounds |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `#64748B` | Secondary text (slate) |
| `--border` | `214.3 31.8% 91.4%` | `#E2E8F0` | Borders (cool gray) |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` | Destructive actions |
| `--ring` | `221.2 83.2% 53.3%` | `#3B82F6` | Focus ring (matches primary) |
| `--radius` | `0.5rem` | 8px | Default border radius |

**Dark Mode**

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background` | `222.2 84% 4.9%` | `#020817` | Deep navy-black |
| `--foreground` | `210 40% 98%` | `#F8FAFC` | Near-white text |
| `--primary` | `217.2 91.2% 59.8%` | `#3B82F6` | Brighter blue |
| `--secondary` | `217.2 32.6% 17.5%` | `#1E293B` | Dark surfaces |
| `--muted` | `217.2 32.6% 17.5%` | `#1E293B` | Muted dark |
| `--muted-foreground` | `215 20.2% 65.1%` | `#94A3B8` | Secondary text |
| `--border` | `217.2 32.6% 17.5%` | `#1E293B` | Borders (blend with bg) |

**Sidebar Color Tokens**

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--sidebar-background` | `0 0% 98%` | Sidebar bg (#FAFAFA) |
| `--sidebar-foreground` | `240 5.3% 26.1%` | Sidebar text |
| `--sidebar-primary` | `240 5.9% 10%` | Active sidebar item |
| `--sidebar-accent` | `240 4.8% 95.9%` | Hover/active bg |
| `--sidebar-border` | `220 13% 91%` | Sidebar border |

**Key insight**: Unlike Aura's pure achromatic palette, 21st.dev uses **cool-toned slate grays** (hue 210-222). The foreground is not true black but a very dark navy `#020817`. This gives the entire UI a slightly cooler, more "techy" feel.

### 2.2 Typography

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Body | `ui-sans-serif, system-ui, sans-serif` | 16px | 400 | 24px | normal |
| Sidebar links | system sans-serif | 14px | 400-500 | 20px | normal |
| Section headings (content) | system sans-serif | 14px | 600 | 20px | normal |
| Component names | system sans-serif | 14px | 400 | 20px | normal |
| Category counts | system sans-serif | 12px | 400 | - | normal |
| Sidebar section headers (h3) | system sans-serif | 12px | 500 | 16px | 0.05em |

**Key typography patterns**:
- **System font stack** (`ui-sans-serif, system-ui`) for all UI text -- intentionally native-feeling
- Small, functional text sizes (12-14px for most UI elements)
- No decorative or display fonts in the app shell
- Category counts displayed inline, subdued (`--muted-foreground`)
- Section headers are small and label-like, not decorative

### 2.3 Layout & Spacing

**Sidebar**:
- Width: `240px` fixed
- Background: `#FAFAFA` (slightly off-white, using `--sidebar-background`)
- Content items have `8px` vertical, `12px` horizontal padding
- No visible border-right (uses background color contrast instead)
- Search bar at top with keyboard shortcut hint (`Cmd+K`)

**Content area**:
- Horizontal scrolling carousels for component categories
- Each category section: heading + "View all" link + carousel
- Cards arranged in rows within carousels

**Component preview cards**:
- White background
- Subtle border (`1px solid #E2E8F0`)
- Border radius: `8px` (matching `--radius`)
- Image preview area with **dark/black backgrounds** (showing components on dark)
- Below: author avatar + component name + like button
- Hover states on cards

### 2.4 Navigation Patterns

**Sidebar navigation**:
- Icon + label format for primary nav (Featured, Newest, Best of Week, Themes)
- Grouped by "Marketing Blocks" and "UI Components" section headers
- Each category shows count badge aligned right (e.g., "Buttons 130")
- Active state: slightly different background tint

**Top bar**:
- "21st" logo/brand mark (left)
- Page title centered ("Components")
- Minimal -- the sidebar carries the navigation weight

**Search**:
- Inline search in sidebar with icon + placeholder
- `Cmd+K` keyboard shortcut prominently displayed as badge

### 2.5 Button Styles

| Variant | Background | Text | Border | Radius | Padding |
|---------|-----------|------|--------|--------|---------|
| "View all" | transparent | `#020817` | none | 6px | 4px 8px |
| Icon buttons | transparent | `#020817` | none | 4px | 4px |
| Like button | transparent | `#64748B` | none | 4px | 2px |

### 2.6 Dark Theme Strategy

21st.dev uses the **shadcn/ui dark mode pattern**:
- Background shifts to deep navy-black (`#020817`) rather than pure black
- All surface colors maintain the cool slate hue family (hue 217)
- Borders become very subtle (same HSL as secondary backgrounds)
- `--muted-foreground` brightens from `#64748B` to `#94A3B8`
- Creates a "cohesive darkness" where everything lives in the same blue-gray family

### 2.7 What Makes It Feel Premium

1. **Component preview contrast** -- dark component previews on white cards create strong visual hierarchy
2. **Information density done right** -- lots of categories and components visible without feeling cluttered
3. **System fonts** -- feels fast and native, zero font loading
4. **Sidebar categorization** -- clear information architecture with counts
5. **Horizontal carousels** -- efficient browsing without vertical scroll fatigue
6. **Dark preview on light shell** -- the actual component previews render on dark backgrounds, making the app shell feel clean and the components feel rich

---

## 3. COMPARATIVE ANALYSIS

### 3.1 Color Theory Comparison

| Aspect | Aura.build | 21st.dev |
|--------|-----------|----------|
| Base hue | Neutral (0 hue) | Cool slate (210-222 hue) |
| Black | True black `#000` | Navy-black `#020817` |
| White | Pure white `#FFF` | Pure white `#FFF` |
| Gray family | Neutral grays | Slate (blue-tinted) grays |
| Primary accent | None (achromatic) | Blue `#3B82F6` |
| Approach | Content-first (UI vanishes) | Tool-first (UI guides) |

### 3.2 Typography Comparison

| Aspect | Aura.build | 21st.dev |
|--------|-----------|----------|
| Font choice | Geist (custom geometric sans) | System font stack |
| Hero text | 48px, weight 600, -2.4px tracking | N/A (app, not landing page) |
| Body text | 16px, weight 400 | 14px, weight 400 |
| Philosophy | Expressive, editorial | Functional, developer-tool |
| Personality | High (curated feel) | Low (utility feel) |

### 3.3 What Both Sites Share (The "Modern Premium" Formula)

1. **Near-zero color** in the UI shell. Both sites are essentially grayscale in their chrome, with color reserved for content or a single accent.

2. **Extremely subtle borders and shadows**. Both use `rgba(0,0,0,0.04)` to `rgba(0,0,0,0.08)` opacity shadows. Borders are barely visible.

3. **Generous whitespace**. Neither site feels dense despite showing lots of content.

4. **Dark mode as a first-class citizen**. Both have complete, well-designed dark themes (not just "inverted colors").

5. **Small, functional UI text**. Navigation and labels are 12-14px, keeping them subordinate to content.

6. **CSS custom properties everywhere**. Both use extensive `--var` token systems for themability.

7. **Component previews on dark backgrounds**. Both show visual content (templates/components) with dark preview areas against light UI shells.

---

## 4. DESIGN SYSTEM RECOMMENDATIONS

### 4.1 Color Tokens (shadcn/ui compatible)

```css
:root {
  /* Background hierarchy */
  --background:          0 0% 100%;        /* #FFFFFF - page */
  --background-subtle:   0 0% 98%;         /* #FAFAFA - cards, sidebar */

  /* Text hierarchy */
  --foreground:          0 0% 9%;          /* #171717 - primary text */
  --muted-foreground:    0 0% 45%;         /* #737373 - secondary text */
  --faint-foreground:    0 0% 63%;         /* #A1A1A1 - placeholder, tertiary */

  /* Surfaces */
  --card:                0 0% 100%;        /* white cards */
  --muted:               0 0% 96%;         /* #F5F5F5 - subtle bg fills */

  /* Borders */
  --border:              0 0% 90%;         /* #E6E6E6 */
  --border-subtle:       0 0% 94%;         /* #F0F0F0 */

  /* Interactive accent (choose ONE) */
  --primary:             0 0% 9%;          /* Black primary (Aura style) */
  /* OR */
  /* --primary:          221.2 83.2% 53.3%; */ /* Blue primary (21st style) */
  --primary-foreground:  0 0% 98%;

  /* System colors */
  --destructive:         0 84% 60%;        /* Red */
  --ring:                0 0% 20%;         /* Focus ring */
  --radius:              0.5rem;           /* 8px */

  /* Sidebar (21st.dev pattern) */
  --sidebar-background:  0 0% 98%;
  --sidebar-foreground:  240 5.3% 26.1%;
  --sidebar-primary:     240 5.9% 10%;
  --sidebar-accent:      240 4.8% 95.9%;
  --sidebar-border:      220 13% 91%;
}

.dark {
  --background:          0 0% 4%;          /* #0A0A0A - near-black */
  --background-subtle:   0 0% 8%;          /* #141414 */
  --foreground:          0 0% 93%;         /* #EDEDED */
  --muted-foreground:    0 0% 56%;         /* #8F8F8F */
  --card:                0 0% 8%;          /* dark card */
  --muted:               0 0% 12%;         /* dark muted */
  --border:              0 0% 16%;         /* dark border */
  --primary:             0 0% 93%;         /* inverted */
  --primary-foreground:  0 0% 9%;
}
```

### 4.2 Typography Scale

```css
/* Font: Geist Sans (preferred) or Inter (fallback) */
--font-sans: "Geist", "Inter", -apple-system, system-ui, sans-serif;
--font-mono: "Geist Mono", "JetBrains Mono", monospace;

/* Scale */
--text-xs:    12px / 16px;    /* Captions, badges, metadata */
--text-sm:    14px / 20px;    /* Nav links, labels, secondary content */
--text-base:  16px / 24px;    /* Body text, paragraphs */
--text-lg:    18px / 28px;    /* Lead paragraphs, subtitles */
--text-xl:    24px / 32px;    /* Section headings */
--text-2xl:   32px / 40px;    /* Page titles */
--text-3xl:   48px / 48px;    /* Hero (1:1 ratio) */
--text-4xl:   60px / 60px;    /* Display / splash (1:1 ratio) */

/* Weight usage */
--font-regular:  400;  /* Body, nav, secondary text */
--font-medium:   500;  /* Buttons, active nav, emphasis */
--font-semibold: 600;  /* Headings, labels */

/* Letter spacing */
--tracking-tight:    -0.02em;  /* Small headings (24-32px) */
--tracking-tighter:  -0.04em;  /* Large headings (48px) */
--tracking-tightest: -0.05em;  /* Display text (60px+) */
```

### 4.3 Spacing Scale

```css
/* 4px base, doubling pattern */
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-6:   24px;    /* Default gap */
--space-8:   32px;    /* Section gap */
--space-10:  40px;
--space-16:  64px;    /* Major section spacing */
--space-24:  96px;    /* Hero/footer spacing */

/* Layout */
--page-width:    1200px;
--page-margin:   24px;
--sidebar-width: 240px;
--header-height: 64px;
```

### 4.4 Shadow System

```css
/* Light mode: barely-visible drop shadows */
--shadow-xs:     0px 1px 2px rgba(0,0,0,0.04);
--shadow-sm:     0px 2px 4px rgba(0,0,0,0.04);
--shadow-md:     0px 2px 2px rgba(0,0,0,0.04), 0px 8px 8px -8px rgba(0,0,0,0.04);
--shadow-lg:     0px 2px 2px rgba(0,0,0,0.04), 0px 8px 16px -4px rgba(0,0,0,0.06);

/* Border-shadow combo (Geist pattern) */
--shadow-border: 0 0 0 1px rgba(0,0,0,0.08);
--shadow-card:   var(--shadow-border), var(--shadow-sm);

/* Dark mode: replace shadows with border rings */
.dark {
  --shadow-xs:     0 0 0 1px rgba(255,255,255,0.08);
  --shadow-sm:     0 0 0 1px rgba(255,255,255,0.08);
  --shadow-md:     0 0 0 1px rgba(255,255,255,0.08);
  --shadow-lg:     0 0 0 1px rgba(255,255,255,0.1);
  --shadow-border: 0 0 0 1px rgba(255,255,255,0.15);
  --shadow-card:   var(--shadow-border);
}
```

### 4.5 Key CSS Patterns to Adopt

**1. Border-as-shadow (Geist pattern)**
```css
.card {
  border: none;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.04);
}
/* Using box-shadow for borders means they don't affect layout
   and can be transitioned smoothly */
```

**2. 1:1 line-height for headlines**
```css
.hero-heading {
  font-size: 48px;
  line-height: 48px;       /* 1:1 ratio */
  letter-spacing: -2.4px;  /* -5% tracking */
  font-weight: 600;
}
```

**3. Ghost navigation**
```css
.nav-link {
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
  padding: 8px 12px;
  border-radius: 6px;
  transition: color 0.15s, background-color 0.15s;
}
.nav-link:hover {
  color: hsl(var(--foreground));
  background-color: hsl(var(--muted));
}
```

**4. Sidebar category list (21st.dev pattern)**
```css
.sidebar-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  font-size: 14px;
  color: hsl(var(--foreground));
  border-radius: 6px;
}
.sidebar-category .count {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-variant-numeric: tabular-nums;
}
.sidebar-category:hover {
  background-color: hsl(var(--muted));
}
```

**5. Card with preview (both sites)**
```css
.component-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: hsl(var(--card));
  transition: box-shadow 0.2s, transform 0.2s;
}
.component-card:hover {
  box-shadow: var(--shadow-border), var(--shadow-md);
  transform: translateY(-1px);
}
.component-card .preview {
  aspect-ratio: 16/10;
  background: #0A0A0A;  /* dark preview area */
  overflow: hidden;
}
.component-card .meta {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**6. Theme toggle (3-state, Aura pattern)**
```css
.theme-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: hsl(var(--muted));
}
.theme-toggle button {
  padding: 4px 6px;
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
}
.theme-toggle button.active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: var(--shadow-sm);
}
```

### 4.6 Animation Recommendations

```css
/* Timing functions */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-spring: cubic-bezier(0.175, 0.885, 0.32, 1.1);

/* Standard transitions */
--transition-fast: 150ms var(--ease-out-expo);
--transition-base: 200ms var(--ease-out-expo);
--transition-slow: 300ms var(--ease-out-expo);

/* Modal/overlay entrance */
@keyframes overlay-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

/* Staggered list entrance */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 5. TAILWIND CSS TOKEN MAPPING

For implementation in a Next.js + Tailwind project:

```js
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        gray: {
          50:   '#FAFAFA',
          100:  '#F5F5F5',
          200:  '#EBEBEB',
          300:  '#E2E8F0',
          400:  '#A1A1A1',
          500:  '#737373',
          600:  '#4D4D4D',
          700:  '#404040',
          800:  '#262626',
          900:  '#171717',
          1000: '#000000',
        },
        accent: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display': ['60px', { lineHeight: '60px', letterSpacing: '-3px' }],
        'h1':      ['48px', { lineHeight: '48px', letterSpacing: '-2.4px' }],
        'h2':      ['32px', { lineHeight: '40px', letterSpacing: '-1.28px' }],
        'h3':      ['24px', { lineHeight: '32px', letterSpacing: '-0.96px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body':    ['16px', { lineHeight: '24px' }],
        'sm':      ['14px', { lineHeight: '20px' }],
        'xs':      ['12px', { lineHeight: '16px' }],
      },
      borderRadius: {
        'sm':   '6px',
        'md':   '8px',
        'lg':   '12px',
        'pill': '9999px',
      },
      boxShadow: {
        'ring':       '0 0 0 1px rgba(0,0,0,0.08)',
        'card':       '0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)',
        'modal':      '0 0 0 1px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)',
      },
      spacing: {
        '18': '4.5rem',   /* 72px */
        '22': '5.5rem',   /* 88px */
        '30': '7.5rem',   /* 120px */
      },
    },
  },
};
```

---

## 6. DESIGN PRINCIPLES SUMMARY

1. **Chromatic restraint**: Use 0-1 accent colors in the UI shell. Let content bring the color.

2. **Invisible borders**: Use `rgba(0,0,0,0.04-0.08)` for light mode. Never use visible gray lines as primary separators.

3. **Tight headline typography**: Letter-spacing of -2% to -5% on headlines 24px and above.

4. **Small functional text**: Keep UI labels at 12-14px. Only hero/marketing text goes above 24px.

5. **Whitespace as hierarchy**: Use generous space (64px-96px) between sections rather than visual dividers.

6. **Dark mode = border mode**: Replace all drop shadows with subtle 1px ring outlines in dark mode.

7. **System responsiveness**: Use native fonts for tool UIs, custom fonts only for marketing/hero areas.

8. **Hover subtlety**: Hover states should be nearly imperceptible shifts in background or shadow, not color changes.

9. **Content as decoration**: Use actual product content (templates, components, code) as visual interest instead of abstract illustrations.

10. **Fast micro-interactions**: `150ms` transitions. Include `transform`, `box-shadow`, and `background` in transition properties.

---

*Analysis performed March 2026 via Playwright browser automation against live production sites.*
