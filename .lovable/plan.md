

# AAA Quality UI Overhaul

## Problem
Transparent/glass backgrounds make text unreadable against the 3D canvas. UI lacks premium feel — needs solid backgrounds, better visual hierarchy, rich animations, and polished micro-interactions.

## Changes Across 5 Files

### 1. `src/index.css` — New animations + design tokens
- Add `@keyframes shimmer` (gradient sweep for card borders on hover)
- Add `@keyframes breath-glow` (subtle ambient glow for active elements)
- Add `@keyframes slide-up-fade` for card entrance
- Add `.game-card` class: solid `rgba(10,15,30,0.99)` bg, 1px gradient border, hover transforms with glow
- Update `.game-panel` to fully opaque `rgba(8,12,24,1)` with stronger border + inner highlight
- Add `.game-panel-accent` variant with colored top-border accent line
- Add `.game-divider` styled separator

### 2. `src/game/GameCanvas.tsx` — Start Screen Overhaul
**Start screen** (lines 413-528):
- Background: fully opaque `#060a14` with animated radial gradients (metro line colors pulsing slowly)
- Add decorative metro map SVG lines behind title (subtle, animated dash-offset)
- Title: larger, with text gradient (white → gold), letter-by-letter stagger maintained but with scale bounce
- Scenario cards: solid `rgba(12,18,35,1)` background, thick left accent border in difficulty color, hover → lift + glow + shimmer border. Each card shows icon larger, difficulty as colored bar (not stars), win condition as a styled badge
- Controls section: solid panel, keyboard keys shown as `<kbd>` styled elements
- Add subtle particle dots floating in background (CSS-only, 6-8 dots with slow drift animation)

**Game Over/Victory** (lines 531-598):
- Solid background, stat rows with alternating subtle stripe
- Victory: animated golden border, stats counter animate up
- Restart button: larger, gradient bg, hover glow

**Notification stack** (lines 621-689):
- All banners get solid opaque backgrounds with left accent stripe
- Air raid: solid `#dc2626` bg, no transparency
- Rush hour: solid `#d97706` bg

### 3. `src/game/ui/TopBar.tsx` — Premium HUD Bar
- Solid `rgba(6,10,20,1)` background, bottom 1px gradient border (red→blue→green matching metro lines)
- Score: rolling digit animation class
- Money: green glow text
- Lives: heart icons with pulse on damage
- Speed buttons: pill shape, active = filled gold with subtle inner shadow
- Wave indicator: styled badge with progress bar underneath showing wave progress
- Right stats: each in its own micro-card with subtle bg, icon colored by state
- Add thin separator lines between stat groups

### 4. `src/game/ui/ActionBar.tsx` — Grouped Action Dock
- Solid `rgba(6,10,20,1)` background, top 1px highlight gradient
- Add section labels above groups: "ПОТЯГИ", "ОБОРОНА", "ЕКОНОМІКА", "АВАРІЙНЕ", "МЕРЕЖА" in 9px uppercase gold text
- Buttons: solid dark bg, 2px colored border, on hover → scale(1.15) + colored glow shadow + tooltip slides up
- Active buttons: filled bg with color, pulsing ring
- Cooldown: sweep overlay (conic-gradient) instead of ring
- Cost badges: larger, solid pill with gradient
- Hotkey badges: styled `<kbd>` look

### 5. `src/game/ui/CameraControls.tsx` + `src/game/ui/Minimap.tsx` — Polish
- CameraControls: solid bg buttons, active = gold fill, vertical layout
- Minimap: solid border with metro-colored top accent, slightly larger (200×160), label "КАРТА" at top

## Visual Identity
- All panels: fully opaque dark backgrounds (`rgba(6-10, 10-15, 20-30, 1)`)
- Borders: gradient or colored accents, never transparent white
- Text: minimum 11px, high contrast white/gold/green
- Hover states: scale + glow + color shift
- Active states: filled color bg + outer glow
- Transitions: spring-based (cubic-bezier(0.34, 1.56, 0.64, 1))

