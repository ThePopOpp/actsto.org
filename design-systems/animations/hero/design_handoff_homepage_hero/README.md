# Handoff: Animated Homepage Hero — actsto.org

## Overview
An animated hero section for the actsto.org homepage. It keeps the existing hero copy and CTAs, and adds a looping animated visual on the right that tells the 4-step "How It Works" story (Create → Share → Receive → Impact) through a single campaign card ("Emma's 3rd Grade Tuition") that evolves through each step. Includes light and dark modes.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. The task is to **recreate this design in the ACTSTO web app's existing environment** (its current framework, component library, and styling conventions), reusing the app's existing nav, buttons, and theme system rather than the mock versions in the prototype.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and animation timing are final intent. Recreate the animation faithfully; swap the mock nav bar and mock buttons for the app's real components.

## Files
- `ACTSTO Homepage Hero.html` — the complete prototype (all CSS + JS inline)
- `uploads/Emma_and_Mom_Design.svg` — illustration used inside the campaign card photo area

## Design Tokens
Colors (oklch as authored; hex fallbacks approximate):
- Page background light: `#F5FBFF`; hero glow: radial `oklch(0.955 0.018 235 / .7)`
- Page background dark: `#03143B`; dark panels/chips: `#0A2158`
- Navy: `oklch(0.225 0.058 258)` (~#1B2A4A) · Navy deep: `oklch(0.165 0.048 258)` · Navy soft: `oklch(0.40 0.054 256)`
- Red: `oklch(0.485 0.158 25)` (~#A93226) · Red deep: `oklch(0.395 0.148 25)`
- Cream: `oklch(0.972 0.014 85)` · Paper: `oklch(0.992 0.005 85)` · Stone: `oklch(0.85 0.012 85)`
- Gold: `oklch(0.78 0.11 85)` · Ink: `oklch(0.22 0.012 80)` · Ink muted: `oklch(0.45 0.012 80)`

Typography:
- Serif: **Fraunces** (headline weight 500, `opsz` 144; card titles weight 600)
- Sans: **Inter** (body, labels, buttons)
- H1: `clamp(44px, 4.6vw, 64px)`, line-height 1.06, letter-spacing −0.015em, navy, `<em>` italic red (gold in dark mode)
- Sub: 17px/1.6 ink-muted, max-width 46ch
- Eyebrow: 12px, 600, letter-spacing 0.14em, uppercase, red (gold in dark), with a 26px rule before it (hidden on mobile)

Radii/shadows: card 14px; chips/pills 999px; card shadow `0 24px 48px -18px navy@35%`.

## Layout
- Hero: two-column grid `minmax(420px,1fr) / minmax(480px,560px)`, gap 72px, max-width 1240px, min-height `100vh − nav`, padding 64px 48px 72px.
- Left column: eyebrow "Get started with 4 Simple Steps" → H1 "Invest in a *Christ-centered* future" → sub copy (existing site copy) → CTAs: "Donate Today" (navy solid; red in dark mode) + "Start a Campaign" (outline). No stats row.
- Right column: animation stage (430px tall, transparent background) + step rail below.
- Mobile (≤1060px): single column, **animation above the text**, everything center-aligned (eyebrow, H1, sub, buttons), stage 400px.

## The Animation (right column)
One persistent campaign card (280px wide, white→#F5FBFF gradient, 1px light-blue border) centered at ~54% stage height, containing: photo area (110px, blue-tint gradient, `Emma_and_Mom_Design.svg` bottom-anchored at 92% height), title "Emma's 3rd Grade Tuition" (Fraunces 16.5px), school line "Valley Christian Schools · Chandler, AZ", progress bar (8px, red gradient fill) with meta "$X raised / $8,000 goal" (tabular-nums).

The loop has 4 steps (durations 4600 / 4600 / 5200 / 5600 ms), auto-advancing, driven by a `step-N` class on the stage:

1. **Create Your Campaign** — card at full scale; title, school, and bar rows stagger in (fade+rise, 0.35/0.5/0.7s delays); photo gets one shimmer sweep; bar animates 0→6%, counter $0→$480.
2. **Share with Your Community** — card scales to 0.82; six avatar circles (initials JW, KM, RS, TL, DB, MC; navy/red/gold fills, 46px) spring out along dashed radial spokes (staggered ~0.1s each, springy cubic-bezier(.3,1.4,.4,1)); a navy link chip "actsto.org/campaigns/emma" (gold dot) rises at bottom.
3. **Receive Donations** — avatars dim to 55%/scale 0.88; donation chips ("$787 tax credit", "$1,570 tax credit", "$250", "$500", "$100", "$320" — amounts red) fly from avatar positions into the card (1.1s each, staggered 0.3–3.0s, fade out on arrival); bar fills to 82%, counter eases $480→$6,560 (cubic ease-out).
4. **Make an Impact** — card lifts 46px / scale 0.94; gold "100% Funded" badge pops on the card corner (springy, +3° rotation, 0.9s delay); 14 gold 4-point sparkles burst outward; navy impact panel rises at bottom: gold ✓ + "**Emma starts school this fall.** Donors receive an impact update — and the cycle of generosity continues." Bar completes to 100%, counter → $8,000. Panel fades out quickly (0.3s, no delay) when leaving the step.

### Step rail (below stage, centered column, gap 14px)
- Four numbered dot buttons (30px circles; active = red fill, scale 1.1). Clicking jumps to that step and resets the timer.
- Single active label (only one shown at a time), crossfading 250ms: Fraunces 17px title + 12.5px sub. Labels: "Create Your Campaign / Tell your story & set a tuition goal", "Share with Your Community / Church members, family & friends", "Receive Donations / Tax-credit gifts arrive in minutes", "Make an Impact / Emma attends school this fall".
- 120×3px progress line under the label, red fill scaleX 0→1 linear over the current step's duration, restarted each step.

## Interactions & Behavior
- Entrance (once on load): left-column elements fade+rise with 0.05–0.42s stagger; stage rises at 0.35s.
- Loop auto-advances via `setTimeout` per-step duration; dot click = jump + restart timing.
- Counter animation: `requestAnimationFrame`, cubic ease-out, formatted `$N,NNN raised`.
- Re-triggering: keyframe animations are scoped under `.step-N` selectors so re-adding the class restarts them; the progress line restarts via class remove → reflow → re-add.
- `prefers-reduced-motion`: freeze on step 4, bar 100%, counter $8,000, no loop.
- Dark mode: `dark` class on `<body>`, persisted in `localStorage` (`actsto-theme`) — in the real app, wire into the existing theme toggle instead. Dark deltas: bg `#03143B`, headline cream with gold `<em>`, eyebrow gold, primary CTA red, outline CTA cream-bordered, spokes cream-dashed, chips/panels `#0A2158`, campaign card stays light.

## State Management
- `cur` (active step 0–3), one timeout handle, one rAF handle for the counter, theme boolean. No data fetching — all content static in the prototype; in production the campaign card could be fed by a real featured campaign.

## Assets
- `Emma_and_Mom_Design.svg` (provided by ACTSTO, navy `#001138` fill illustration).
- Fonts from Google Fonts (Fraunces, Inter) — use the app's existing font loading.
