# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vanilla JavaScript Pomodoro timer web app that visually replicates a physical cube timer. Zero dependencies, no build tools — open `index.html` in a browser to run.

## Architecture

Three files with clear separation of concerns:

- **index.html** — DOM structure: cube bevel wrapper, cube face, screen bezel + screen, SVG tick ring, four 7-segment digit elements (MM:SS inline), colon separator, preset buttons (5/10/25/50 min), Start/Pause + Reset controls
- **style.css** — All visual design and animations. 7-segment digits use CSS `clip-path` polygons with ghost segments. Tick ring, colon blink, screen flash, and digit blink animations are pure CSS `@keyframes`.
- **app.js** — Timer state machine, SVG tick generation (60 lines at 6° intervals), segment map for digits 0-9, drift-proof timing via `Date.now()` timestamps (not `setInterval` counting), Web Audio API alarm (3 square-wave beeps at 880Hz), Browser Notification API

## Color Palette

| Element | Color |
|---------|-------|
| Page background | `#0d0d0d` |
| Cube face | `#f0f0f0` |
| Cube bevel | gradient `#e8e8e8` → `#b8b8b8` |
| Screen bezel | gradient `#888` → `#ddd` (inverted = recessed look) |
| Active ticks | `#e8850c` |
| Depleted ticks | `rgba(232,133,12, 0.08)` |
| Screen | `#0a1628` |
| Digits on | `#00d4ff` with glow |
| Digits off (ghost) | `rgba(0,212,255, 0.07)` |

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed technical explanations of the 7-segment display, tick ring, bevels, timer logic, and alarm.

## Key Behaviors

- Tick ring depletes **counter-clockwise**; the current tick blinks only while running
- Timer uses 250ms `setInterval` but calculates actual elapsed time from `Date.now()` for accuracy
- Notification permission is requested only once per session on first Start click
- Space bar toggles Start/Pause; colon blinks when paused
- Reference photos (`assets/physical-pomodoro-timer-*.jpeg`) show the target design
- 3D bevels use wrapper elements with gradient backgrounds (not box-shadow, which is too subtle on white). Cube bevel gradient is light→dark (raised); screen bezel gradient is dark→light (recessed/inward)
