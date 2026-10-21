# Figure Guide (SVG figures as React components)

Figures for week NN live in `src/content/figures/wNN.tsx`:

```tsx
// src/content/figures/w04.tsx
import type { FigureMap } from "@/content/types";
import { Resistor, Battery, Wire, Label, Arrow, Ground, Lamp, SwitchSym } from "./kit";

function SeriesCircuit() {
  return (
    <svg viewBox="0 0 600 360" aria-hidden="true">
      {/* … */}
    </svg>
  );
}

export const figures: FigureMap = {
  "W04-F01": SeriesCircuit,
  // …
};
export default figures;
```

## Rules

1. **Original drawings only.** Never trace or embed the scanned textbook images or any third-party photo. Re-draw concepts from the descriptions in the audit files.
2. **Engineering-correct.** IEC 60617 symbols (rectangle resistor, IEC lamp ⊗, battery long plate = +), correct polarity, correct meter placement (ammeter in series, voltmeter in parallel), conventional current arrows from + to − outside the source unless the figure is explicitly about electron flow (label it "การไหลของอิเล็กตรอน"). Wire colours per มอก. 11-2553: L brown, N blue, PE green–yellow stripes. Values and labels must agree with the text.
3. **Theme tokens only.** Use `var(--fig-*)` CSS variables for every stroke/fill (see `src/app/globals.css`), e.g. `stroke="var(--fig-ink)"`, `fill="var(--fig-panel)"`. Never hard-code colours (the only exception: `fill="none"`, `transparent`). Text: `fill="var(--fig-ink)"` or `var(--fig-muted)`.
4. **Legible on a 360 px phone.** Figures render at full column width (≈ 330 px on phones, ≤ 720 px on desktop).
   * Standard figures: `viewBox` width **600** (height as needed, ideally ≤ 450). Minimum text size **20** units; main labels **22–26**. Stroke widths: conductors 3, symbol outlines 3, minor lines 1.5–2.
   * Wide figures (`wide: true` in the FigureRef): viewBox width up to **900**, minimum text **26**; they get horizontal scroll with min-width 560 px on phones — use sparingly (wiring diagrams, timelines).
   * Max ~8 labels per figure; split complex ideas into several figures.
5. **Text in SVG:** Thai with English terms, e.g. `ตัวต้านทาน R₁ = 100 Ω`. Use `<text>` with `fontSize`, `textAnchor`, `dominantBaseline="middle"` where centring. Use Unicode subscripts/symbols (R₁, Ω, µ, °, ±, ≈, →) — not KaTeX. Font family inherits from CSS (do not set font-family).
6. **Never rely on colour alone:** pair colour with text labels, patterns (`strokeDasharray`), or icons (✓ ✗). Danger = red + "อันตราย", OK = green + "ถูกต้อง".
7. **Animation** (optional, for principle-of-operation figures): CSS keyframes inside a `<style>` element in the SVG using a figure-unique class prefix (e.g. `.w04f03-flow`), e.g. moving current dots via `stroke-dashoffset`. Must be subtle, loop slowly, and is automatically disabled by `prefers-reduced-motion` (global CSS). The static frame must still make sense.
8. **Hotspot figures:** if an interaction overlays hotspots, its `viewBox` in the interaction must equal the SVG viewBox exactly; place spot centres on the drawn element.
9. **Accessibility:** the SVG gets `aria-hidden="true"`; the FigureRef `alt` carries the full description (what it shows, values, takeaway) and `caption` is a short title (shown under the figure, numbered automatically).
10. **No decoration.** Every figure must teach something stated in the step. No clip-art, logos, brand names, or photos.
11. Components are pure (no hooks, no state, no props). Keep each figure self-contained; shared primitives come from `./kit`.

## Primitive kit (`src/content/figures/kit.tsx`)

All primitives draw in the current coordinate system and use theme tokens. Read the file for exact props before using. Main ones:

* `Wire({ d | points, color?, width? })` — polyline/path conductor.
* `Resistor({ x, y, angle?, label?, value?, labelSide? })` — IEC rectangle 60×20 centred on (x,y).
* `Battery({ x, y, angle?, label?, cells? })` — long (+) / short (−) plates with + sign.
* `DCSource`, `ACSource({x,y,label})` — circle with ~.
* `Lamp({ x, y, on?, label? })` — IEC ⊗ lamp, glow when on.
* `SwitchSym({ x, y, closed?, angle?, label? })` — SPST.
* `Meter({ x, y, kind: "A"|"V"|"Ω", label? })` — circle with letter.
* `Ground({ x, y, kind?: "earth"|"chassis"|"pe" })`.
* `Capacitor({ x, y, angle?, polarized?, label? })`, `Inductor({ x, y, angle?, turns?, core?, label? })`.
* `Diode({ x, y, angle?, kind?: "diode"|"led"|"zener", label? })`, `NPN({ x, y, label? })`, `PNP`.
* `Arrow({ from:[x,y], to:[x,y], color?, label? })` — current/direction arrow.
* `Label({ x, y, children, size?, anchor?, muted?, weight? })` — text with readable defaults (22).
* `Node({ x, y })` — junction dot.
* `Callout({ x, y, w, h, tone, children })` — boxed note inside a figure.

If a needed primitive is missing, draw it inline in your figure file (do not edit kit.tsx).

## Self-check

Run `npm run fig:render -- --week NN` to render every figure of your week to PNG in `.figcheck/wNN/` (light theme) and open the PNGs to check layout, overlaps, clipping, and label legibility. Fix until clean.
