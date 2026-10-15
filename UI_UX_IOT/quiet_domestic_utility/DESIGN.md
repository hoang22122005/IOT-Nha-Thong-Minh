---
name: Quiet Domestic Utility
colors:
  surface: '#f2fcf2'
  surface-dim: '#d3ddd3'
  surface-bright: '#f2fcf2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf6ed'
  surface-container: '#e6f1e7'
  surface-container-high: '#e1ebe1'
  surface-container-highest: '#dbe5dc'
  on-surface: '#151e18'
  on-surface-variant: '#404943'
  inverse-surface: '#29332c'
  inverse-on-surface: '#e9f3ea'
  outline: '#707972'
  outline-variant: '#bfc9c1'
  surface-tint: '#2a6a4b'
  primary: '#054f33'
  on-primary: '#ffffff'
  primary-container: '#276749'
  on-primary-container: '#a1e3bd'
  inverse-primary: '#93d4af'
  secondary: '#546258'
  on-secondary: '#ffffff'
  secondary-container: '#d7e6da'
  on-secondary-container: '#5a685e'
  tertiary: '#7a2b0b'
  on-tertiary: '#ffffff'
  tertiary-container: '#994121'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#aff1ca'
  primary-fixed-dim: '#93d4af'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#0a5135'
  secondary-fixed: '#d7e6da'
  secondary-fixed-dim: '#bccabf'
  on-secondary-fixed: '#121e17'
  on-secondary-fixed-variant: '#3d4a41'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#7d2d0e'
  background: '#f2fcf2'
  on-background: '#151e18'
  surface-variant: '#dbe5dc'
  bg-app: '#F6F7F4'
  bg-surface: '#FFFFFF'
  bg-subtle: '#EEF1EC'
  text-primary: '#202923'
  text-secondary: '#566159'
  border-default: '#DDE3DC'
  border-control: '#7B897F'
  accent-hover: '#1E5239'
  accent-soft: '#E7F0E9'
  warning-text: '#80530E'
  warning-bg: '#FFF5DF'
  danger-text: '#B42318'
  danger-bg: '#FEF0ED'
  chart-temperature: '#A64B2A'
  chart-humidity: '#2B6A91'
typography:
  display-metric:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: '0'
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

### Personality & Purpose
The design system establishes a quiet, dependable, and truthful home dashboard. It deliberately turns away from speculative gadgetry, neon-drenched dark modes, skeuomorphic 3D floor plans, decorative AI buzzwords, and simulated eco-scores. The interface behaves like architectural hardware: calm, clear, grounded, and engineered for high readability in ambient domestic lighting.

### Core Philosophy: "Bớt AI" (Functional Integrity)
- **Truthful Telemetry:** Every displayed metric reflects verified hardware status. Numerical telemetry uses tabular figures to prevent horizontal shifting during live stream updates.
- **Explicit State Separation:** Control actions distinguish between optimistic command dispatching and hardware confirmation.
- **Tactful Restraint:** Avoid gratuitous motion, decorative blur passes, glow rings, or gradient flood fills. Functional contrast and hairline perimeter definition replace heavy dropped shadows.

### Visual Style
A tailored expression of **Warm Architectural Minimalism**. The canvas uses natural ivory and sage undertones, crisp hairline container boundaries, deliberate typography, and deep forest-green accents. It instills serene confidence and effortless domestic control.

## Colors

### Palette Architecture
The palette operates strictly in **light mode**, engineered around low visual strain and verified accessibility ratios exceeding WCAG AA standards (4.5:1 for standard text, 3:1 for interactive bounds).

- **Primary (`#276749` / Deep Forest Green):** Anchors high-priority actions, verified active device states, focus indicators, and selected navigation.
- **Secondary (`#7B897F` / Muted Sage Slate):** Structures form controls, inactive boundaries, interactive handles, and non-primary indicators.
- **Tertiary (`#A64B2A` / Terracotta):** Dedicated physical telemetry channel for temperature metrics and critical operational heating points.
- **Neutral (`#202923` / Dark Pine Charcoal):** Primary text and definitive icons; delivers crisp contrast without harsh pure black (`#000000`).

### Surface & Functional Tokens
- **Application Canvas (`#F6F7F4`):** Warm ivory foundation providing eye comfort during sustained daylight and indoor monitoring.
- **Surfaces (`#FFFFFF`):** High-clarity cards, structural containers, and overlays.
- **Subtle Layer / Hover (`#EEF1EC`):** Interactive feedback and subdued card grouping.
- **Alert States:** Muted warning backgrounds (`#FFF5DF`) paired with high-contrast text (`#80530E`); incident alerts use `#FEF0ED` paired with `#B42318`.
- **Telemetry Visuals:** Temperature lines utilize terracotta (`#A64B2A`), while relative humidity adopts deep nautical slate (`#2B6A91`).

## Typography

### Typographic Identity
The typographic scale is systematic, utilitarian, and optimized for legibility across varied device viewports and screen qualities. In execution environments where system UI fallbacks are preferred, `Inter` maps cleanly to `"Segoe UI", system-ui, -apple-system, sans-serif`.

### Strict Numeric Formatting
All sensor values, real-time readouts, timecodes, and tabular metrics must enforce tabular figures:
```css
font-variant-numeric: tabular-nums;
```
This rule guarantees zero jitter during dynamic telemetry polling.

### Rules & Hierarchy
- **Display Metric (`32px`, Semi-bold):** Telemetry quantities (e.g., `24.5`, `68`). The unit descriptor (`°C`, `%`) is rendered at `body-lg` (`16px`) in `--text-secondary`.
- **Page Titles (`headline-lg` / `headline-lg-mobile`):** Main application screen identifiers.
- **Section Headers & Room Titles (`headline-sm` / `18px`):** Room and zone divisions.
- **Device Identifiers (`label-md` / `15px–16px`, Semi-bold):** Hardware identity and primary labels.
- **Minimum Size Floor:** Typography strictly terminates at `13px` (`caption`). Micro-text under `12px` is prohibited to maintain accessibility across tablets and wall-mounted touch displays.

## Elevation & Depth

### Philosophy: Structural Planarity
The design system avoids artificial drop shadows, floating cards, and diffuse frosted glass filters (`backdrop-filter: blur()`). Spatial hierarchy is established through surface color layering and hairline border definitions.

### Depth Implementation Levels
- **Level 0 (Canvas Base):** `--bg-app` (`#F6F7F4`), flat baseline.
- **Level 1 (Card & Module Surface):** `--bg-surface` (`#FFFFFF`) with a `1px solid var(--border-default)` (`#DDE3DC`) perimeter. No box shadow.
- **Level 2 (Interactive Active & Hover):** Subtle tonal shift to `--bg-subtle` (`#EEF1EC`) with zero elevation lift (no `transform: translateY` effects).
- **Level 3 (Overlays, Flyouts & Modals):** `--bg-surface` (`#FFFFFF`) framed by `1px solid var(--border-default)`, supported by a calm ambient shadow:
  ```css
  box-shadow: 0 8px 24px rgba(32, 41, 35, 0.08);
  ```
- **Focus Indicator:** Crisp `2px solid var(--accent)` (`#276749`) with an offset of `3px`, providing unambiguous focus states for keyboard and assistive navigation.

## Shapes

### Geometric Proportions
The design system adheres to an architecturally anchored radius scale. Radius values correlate directly with the physical footprint of the element:

- **Interactive Controls (`8px` / `--radius-control`):** Input fields, select pickers, action buttons, segmented controls, and toggle switches.
- **Content Cards & Panels (`12px` / `--radius-card`):** Room modules, telemetry graph boxes, diagnostic blocks, and alert containers.
- **Dialogs & Overlay Modals (`16px`):** Centered dialogs, modal confirmation sheets, and popovers.
- **Status Pills & Tags (`9999px`):** Operational badges, room connectivity pills, and state tags.

## Components

### Buttons
- **Primary Action:**
  - Height: `40px`–`44px` (touch-safe).
  - Background: `--accent` (`#276749`), Hover: `--accent-hover` (`#1E5239`).
  - Text: `#FFFFFF`, weight `600`, radius `8px`.
  - Padding: `0 16px`.
- **Secondary Action:**
  - Background: `#FFFFFF`, Hover: `--bg-subtle` (`#EEF1EC`).
  - Border: `1px solid var(--border-control)` (`#7B897F`).
  - Text: `--text-primary` (`#202923`).
- **Destructive Action:**
  - Background: `--danger-bg` (`#FEF0ED`), Border: `1px solid #FECDCA`, Text: `--danger-text` (`#B42318`).

### Input Fields & Controls
- **Text Inputs & Selects:**
  - Background: `#FFFFFF`, Border: `1px solid var(--border-control)` (`#7B897F`), Radius: `8px`.
  - Height: `40px`, Padding: `0 12px`, Text: `--text-primary` (`#202923`).
  - Focus: Outline `2px solid var(--accent)` with `3px` offset.
- **Checkboxes & Radios:**
  - Dimensions: `18px × 18px`.
  - Border: `1.5px solid var(--border-control)`.
  - Checked State: Fill `--accent` (`#276749`) with high-contrast `#FFFFFF` checkmark.

### Toggle Switches (Actuator Controls)
- Dimensions: Track `48px × 26px`, Thumb `20px × 20px`.
- Track Inactive: `--bg-subtle` (`#EEF1EC`) with `1px solid var(--border-control)`.
- Track Active: `--accent` (`#276749`).
- Accessibility Requirement: Every toggle must accompany a companion text label denoting state ("Đang bật" / "Đang tắt") to avoid color-only reliance.
- Pending Hardware ACK: Subtle pulse opacity on thumb or muted track while awaiting physical node confirmation.

### Cards & Room Modules
- Background: `--bg-surface` (`#FFFFFF`), Border: `1px solid var(--border-default)` (`#DDE3DC`), Radius: `12px`.
- Internal Padding: `20px` to `24px`.
- Incident Outlines: Cards housing active device faults switch borders to `1px solid var(--danger-text)` (`#B42318`).

### Alert Banners & Badges
- **Status Badges:** Radius `9999px`, Padding `2px 10px`, Type `13px` (`label-sm`).
  - Normal/Active: Background `--accent-soft` (`#E7F0E9`), Text `--accent` (`#276749`).
  - Warning: Background `--warning-bg` (`#FFF5DF`), Text `--warning-text` (`#80530E`).
  - Alert: Background `--danger-bg` (`#FEF0ED`), Text `--danger-text` (`#B42318`).
- **Alert Banner:** Full-width or card-top banner, Radius `12px`, background `--danger-bg`, text `--danger-text`, framing actionable recovery buttons.

### Data Charts & Graphs
- Canvas Background: Pure white, zero vertical gradients.
- Grid lines: Hairline `1px` in `--border-default` (`#DDE3DC`).
- Line Weights: Clean `2px` stroke without rounded endpoint embellishment.
  - Temperature: `--chart-temperature` (`#A64B2A`).
  - Humidity: `--chart-humidity` (`#2B6A91`).
- Point Markers: Hidden during continuous sampling; displayed only on deliberate pointer hover inspection.