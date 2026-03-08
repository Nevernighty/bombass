

# Phase 8: Ultimate Polish — Animations, Interactions, Camera, UI/UX, VFX

## Current Issues

1. **Console errors**: `DecoyMarkers`, `ExplosionsLayer`, `RepairUnitsLayer`, `NotificationsLayer` all get ref warnings — R3F tries to pass refs to function components
2. **Camera still awkward**: Tilt angle defaults to 0.65 rad (~37°) which is too steep for overview; cinematic is a basic figure-8; no smooth auto-pan to events
3. **UI has zero hover animations**: Buttons are static, no tooltips, no transitions, no micro-interactions
4. **Start screen is bland**: Plain text buttons with no visual appeal, no animation on load
5. **Station panel is a wall of buttons**: No hover effects, no transition animations, no visual hierarchy
6. **Action bar lacks feedback**: Clicking a button has no visual response beyond state change
7. **No passenger selection/interaction**: Can't click individual passengers, no visual for passenger movement
8. **Floating scores are tiny and static**: No scale-in animation, no bounce
9. **Achievement toast is basic**: Slide from right, no particle/glow effect
10. **Game over/victory screen is plain**: No animation, no stats breakdown reveal
11. **Trains lack personality**: All same model, no animation variety

## Plan (~10 files)

### 1. Fix Console Ref Errors (4 files)
- Add `React.forwardRef` to `ExplosionsLayer`, `DecoyMarkers`, `RepairUnitsLayer`, `NotificationsLayer` — or simply don't pass refs from parent (the issue is R3F passing refs to function components)

### 2. Start Screen Overhaul (`GameCanvas.tsx`)
- Animated title: letters fade in one by one with staggered delay
- Mode cards: hover scale 1.05 with glow border transition, staggered fade-in on mount
- Background: animated gradient pulse (dark blue → dark purple → dark blue)
- Controls hint: accordion-style reveal on "Керування" click
- Add pulsing "ГРАТИ" call-to-action on Classic card

### 3. Enhanced Camera System (`Scene3D.tsx`)
- **Auto-pan to explosions**: When drone hits station, smoothly pan camera toward impact for 1.5s then return (only in free mode, interruptible by user input)
- **Smooth tilt transition**: When switching modes, animate tilt over 0.5s instead of instant snap
- **Double-click to center**: Double-click on map to center camera on that point
- **Scroll zoom toward cursor**: Calculate world-space cursor position and zoom toward it

### 4. Animated UI Components

**ActionBar.tsx** — Complete redesign:
- Buttons get `group-hover` scale 1.1 with spring transition (CSS `transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)`)
- On click: brief scale-down to 0.9 then bounce back (CSS keyframe `button-press`)
- Active effects get pulsing glow ring (CSS `box-shadow` animation)
- Tooltip on hover: slide-up fade-in with arrow, shows name + cost + description + hotkey
- Disabled buttons: grayscale filter + strikethrough price
- Money insufficient: show price in red with shake animation

**StationPanel.tsx** — Animated panel:
- Panel slides in from left with spring animation on open
- Buttons have hover brightness + translateY(-1px) lift effect
- HP bar animates smoothly with CSS transition
- Passenger shapes have subtle breathing scale animation
- Close button rotates 90° on hover
- Section headers have subtle underline-expand animation on panel open

**TopBar.tsx** — Micro-animations:
- Score counter: animate number change with rolling digits effect (CSS counter)
- Money change: flash green/red briefly when money changes
- Lives: hearts have pulse animation when damaged
- Combo: scale up briefly when combo increases
- Wave indicator: flash animation when new wave starts

### 5. Floating Score System Upgrade (`GameCanvas.tsx`)
- Scores animate with CSS keyframe: scale 0→1.2→1 over 200ms, then drift up and fade
- Critical hits ("КРИТ!") get extra rotation wobble
- Combo milestones show larger centered text with golden glow burst
- Add CSS `@keyframes float-score` with transform + opacity

### 6. Game Over / Victory Screen Animation (`GameCanvas.tsx`)
- Stats reveal one by one with 200ms stagger (fade-in + slide-up each)
- Score does counting animation from 0 to final value over 1.5s
- Victory: confetti-like CSS particles (20 small colored divs with randomized fall animation)
- Game Over: screen cracks effect (CSS pseudo-elements with diagonal lines fading in)
- Achievement icons bounce in one by one
- "ГРАТИ ЗНОВУ" button pulses with golden glow

### 7. Hover Interactions on 3D Objects

**StationNode3D.tsx**:
- On hover: station scales up 1.15x smoothly, emissive intensity increases, show station name larger
- On click: brief "select" ring expansion animation (scale ring from 1→1.5 and fade)
- Passenger dots orbit station at different speeds based on patience (impatient = faster)

**DroneModel.tsx**:
- On hover: show red targeting reticle ring around drone, highlight with brighter glow
- On hover: cursor changes to crosshair (via onPointerEnter setting CSS cursor)
- Damaged drones trail more smoke (scale trail particle count by damage ratio)

**TrainModel.tsx**:
- On hover: show capacity bar above train, highlight with line-colored glow
- Selected train: pulsing selection ring with rotating dashes effect
- When dwelling at station: small "loading" dots animation

### 8. New CSS Animations (`index.css`)
Add keyframes for:
- `button-press`: scale 1→0.92→1.05→1 over 200ms
- `float-score`: translateY(0) opacity(1) → translateY(-60px) opacity(0) over 1.5s
- `slide-in-left`: translateX(-100%) → translateX(0) over 300ms with spring
- `glow-pulse`: box-shadow oscillation for active buttons
- `stat-flash`: background-color flash for value changes
- `confetti-fall`: random horizontal drift + fall for victory particles
- `heart-pulse`: scale 1→1.3→1 for life loss
- `title-letter`: opacity 0→1, translateY(10px)→0, staggered

### 9. Passenger Visual Feedback
- When passenger boards train: small "+1" particle at station
- When passenger delivered: green checkmark particle at destination
- Impatient passengers (low patience): their dot blinks faster
- Abandoned passengers: red "X" notification

### 10. Sound-Synced Visual Cues
- Air raid siren: screen edges pulse red in sync
- Passenger delivery: brief green flash on station
- Train arrival: station ring briefly expands

## File Summary

| File | Changes |
|------|---------|
| `GameCanvas.tsx` | Start screen animations, game over animation, floating score CSS upgrade, confetti system, double-click handler |
| `Scene3D.tsx` | Auto-pan to impacts, smooth mode transitions, double-click center |
| `ActionBar.tsx` | Hover/click animations, tooltips, spring transitions, money-insufficient feedback |
| `StationPanel.tsx` | Slide-in animation, hover effects, breathing passenger dots |
| `TopBar.tsx` | Rolling score, money flash, heart pulse, combo scale |
| `StationNode3D.tsx` | Hover scale, click ring animation, cursor change |
| `DroneModel.tsx` | Hover targeting reticle, cursor crosshair, damage-scaled trails |
| `TrainModel.tsx` | Hover glow, dwell animation dots |
| `index.css` | 8+ new keyframe animations |
| `ExplosionEffect.tsx` | Fix forwardRef warning |
| `DecoyMarkers.tsx` | Fix forwardRef warning |
| `NotificationsLayer.tsx` | Fix forwardRef warning |
| `RepairUnitModel.tsx` | Fix forwardRef warning |

~13 files. Focus is entirely on polish, feel, and interaction quality — no new game mechanics.

