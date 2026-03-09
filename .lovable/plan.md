

# Fix: Start Screen Content Not Visible + Final UI Polish

## Problem
The screenshot shows only the title "KYIV TRANSIT" and "RESILIENCE" — all scenario cards, description text, and controls are invisible. The start screen container uses `flex items-center justify-center` with `overflow: hidden` (from body CSS), so content taller than viewport is clipped. Additionally, the `title-letter` animation with `both` fill-mode starts elements at `opacity: 0` and some may not trigger if outside viewport.

## Changes (3 files)

### 1. `GameCanvas.tsx` — Fix start screen visibility + scroll

**Start screen container** (~line 415):
- Add `overflow-y-auto` to the start screen wrapper so cards are scrollable
- Change inner flex to `py-12` padding so content starts from top with breathing room
- Reduce animation delays on cards (currently `0.8 + idx * 0.1s`) — shorten to `0.2 + idx * 0.08s` so they appear faster
- Fix the description text `title-letter` animation delay (currently 0.7s both) — reduce to 0.3s
- Controls panel animation delay: reduce from 1.4s to 0.6s
- Add `items-start` instead of `items-center` on the outer container for tall content, with `pt-8 pb-12`

**Game Over/Victory** (~line 571): Already looks correct with solid backgrounds.

**Notification stack** (~line 672): Already solid — no changes needed.

### 2. `StationPanel.tsx` — Ensure solid opaque background

- Line 35: Change `rgba(15, 22, 38, 0.95)` → `rgba(15, 22, 38, 1)` for StatusChip
- Line 53: Change `rgba(20, 28, 45, 0.95)` → `rgba(20, 28, 45, 1)` for GridBtn
- Ensure the main panel wrapper is fully opaque (check and fix any remaining transparency)

### 3. `index.css` — Ensure `overflow-y: auto` works on start screen

- No body overflow change needed — the start screen div itself will get `overflow-y: auto`

## Summary
The core fix is making the start screen scrollable and reducing animation delays so all content appears quickly. Secondary polish ensures all remaining panels use fully opaque backgrounds.

