# Implementation Details

Technical reference for how each visual feature and the timer logic work.

## 7-Segment Display

Each digit is a `<div class="digit">` containing 7 absolutely positioned `<span>` elements, one per segment:

```
 ─a─
|   |
f   b
|   |
 ─g─
|   |
e   c
|   |
 ─d─
```

**Shapes:** Each segment is a small rectangle clipped into a hexagon via `clip-path: polygon(...)`. Horizontal segments (a, d, g) are 28x7px. Vertical segments (b, c, e, f) are 7x32px. The polygon gives tapered/pointed ends like real LED segments.

**Positioning:** All segments use `position: absolute` within the 44x76px digit container:
- `seg-a`: `top: 0`, `seg-d`: `bottom: 0`, `seg-g`: `top: 50%`
- `seg-f`/`seg-b`: `top: 5px`, left/right sides
- `seg-e`/`seg-c`: `bottom: 5px`, left/right sides

**Ghost segments:** Default background is `rgba(0, 212, 255, 0.12)` — faintly visible, mimicking unlit segments on a real display. The `.on` class switches to `#00d4ff` with a `drop-shadow` glow.

**Digit mapping (JS):** A lookup table maps each number (0-9) to a 7-element array indicating which segments are on:

```js
{ 0: [1,1,1,1,1,1,0], 1: [0,1,1,0,0,0,0], 2: [1,1,0,1,1,0,1], ... }
//    a b c d e f g
```

`setDigit(el, num)` toggles the `.on` class on each span. `updateDisplay(seconds)` splits time into MM:SS digits and updates all four.

**Why CSS `clip-path` over SVG shapes?** Both could produce the same hexagonal segments, but `clip-path` is a better fit here:
- **Ghost segments for free** — every `<span>` is always in the DOM with a faint background. Toggling on/off is just a CSS class swap. SVG would require managing fill/opacity on individual `<path>` elements.
- **Simpler DOM** — each digit is 7 `<span>` tags in a `<div>`, positioned with standard CSS (`width`, `height`, `top`, `right`). SVG would introduce a separate coordinate system (`viewBox`, `<path d="...">`, `transform` attributes) — more powerful, but overkill for simple hexagons.
- **CSS animations just work** — the glow (`filter: drop-shadow`), blink animation, and background transitions are all standard CSS. SVG elements can be styled with CSS too, but some properties behave differently (`fill` vs `background`, `stroke` vs `border`).
- **When SVG would be better** — if segments had complex curved shapes, or if digits needed to scale to arbitrary sizes while staying crisp, SVG paths would be the stronger choice.

## Tick Ring

60 SVG `<line>` elements generated on page load by `generateTicks()`. Each line is positioned using trigonometry at 6-degree intervals starting at 12 o'clock (`-90°` offset). Lines run from radius 120 to 136 within the 280x280 SVG viewBox, with 3.5px stroke width and butt linecaps for a dense appearance.

**Depletion:** Ticks deplete counter-clockwise. `updateTickRing(remaining, total)` calculates how many ticks should be lit (`Math.ceil((remaining / total) * 60)`) and applies three classes:
- `.active` — lit orange (`#e8850c`)
- `.current` — the next tick to deplete, blinks via CSS animation (only while `isRunning` is true)
- `.depleted` — near-invisible (`rgba(232,133,12, 0.08)`)

## 3D Bevels

CSS `box-shadow` was too subtle on white surfaces. Instead, bevels use **wrapper elements with gradient backgrounds** acting as visible borders:

- **Cube bevel** (`.cube-bevel`): 6px padding, `linear-gradient(135deg, #e8e8e8 → #b8b8b8)`. Light top-left to dark bottom-right = raised appearance.
- **Screen bezel** (`.screen-bezel`): 6px padding, `linear-gradient(160deg, #888 → #ddd)`. Dark top to light bottom = the **opposite** direction, which makes the screen look recessed/sunken (top edge is shadowed, bottom edge catches light).

## Timer Logic

Timer accuracy doesn't rely on `setInterval` counting. Instead:
1. On start, record `startTimestamp = Date.now()`
2. A 250ms interval calls `tick()`, which computes `elapsed = Date.now() - startTimestamp`
3. `remainingSeconds = totalSeconds - elapsed`

This is drift-proof and survives browser tab throttling. On pause, elapsed time is accumulated in `elapsedAtPause` so it persists across pause/resume cycles.

## Alarm Sound

Uses Web Audio API — no audio files. `playAlarm()` creates 3 rounds of 3 square-wave beeps at 880Hz (~3 seconds total), with pauses between rounds. Each beep uses a gain node with `exponentialRampToValueAtTime` for a quick decay. Test in the browser console with `playAlarm()`.

## Completion Effects

When the timer reaches 0:
- Screen flashes via `screenFlash` CSS animation (background lightens 3 times)
- Digits blink via `digitBlink` animation on `.seg.on` elements
- Alarm beeps play
- Browser notification fires (if permission was granted)
