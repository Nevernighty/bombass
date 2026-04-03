

# KYIV BOMBASS TRANSIT — Grand Overhaul: Mobile UX, Gameplay Depth, VFX & Dopamine

This plan addresses the game being too primitive and poorly playable on mobile by overhauling touch controls, UI layout, visual effects, audio, and gameplay loops to create an addictive, polished mobile-first experience.

## Current Problems Identified

- **Mobile UX**: Touch panning works but UI panels (StationPanel, ActionBar, TopBar) are desktop-sized; action buttons are tiny at 40x40px; no haptic feedback; no mobile-friendly bottom sheet panels
- **Gameplay pacing**: Stations unlock too randomly; limited dopamine feedback loops; combo system is shallow; no streak rewards beyond x5; no daily challenge or progression persistence
- **VFX/Graphics**: Explosions and effects are decent but lack screen-wide impact events, particle bursts, or satisfying destruction cascades
- **Audio**: Only basic procedural tones — no layered music that responds to gameplay intensity, no satisfying "ka-ching" for money, no heartbeat at low HP

---

## 1. Mobile-First UI Overhaul

**Files**: `GameCanvas.tsx`, `ActionBar.tsx`, `StationPanel.tsx`, `TrainPanel.tsx`, `TopBar.tsx`, `index.css`

- Detect mobile via `useIsMobile()` hook (already exists)
- **TopBar**: Compact single-row on mobile — show only score, money, lives, combo. Tap to expand full stats
- **ActionBar**: Replace horizontal dock with a **FAB (floating action button)** that opens a radial/grid menu on tap. 4 category buttons in a bottom-fixed row, each opens a slide-up panel with large 56x56px touch targets
- **StationPanel / TrainPanel**: Convert to bottom sheet drawers (slide up from bottom, swipe down to dismiss) instead of fixed side panels. Use `touch-action: none` on game canvas to prevent scroll interference
- **Start Screen**: Stack layout on mobile — city selector as horizontal scroll cards, scenario cards in single column, larger touch targets
- **Pinch-to-zoom**: Already works via touch handlers, but add visual zoom indicator
- **Double-tap**: Quick-select nearest station

## 2. Dopamine-Boosting Gameplay Mechanics

**Files**: `GameEngine.ts`, `types.ts`, `config/difficulty.ts`

### 2a. Streak & Multiplier System
- Replace flat combo with a **streak timer**: each delivery resets a 5s countdown; maintaining streak builds multiplier faster (x1 → x2 → x3 → x5 → x10)
- At x10, trigger **FEVER MODE**: screen border glows gold, all trains move 50% faster, double fare for 10s, screen-shake celebration
- Streak break plays a "glass shatter" SFX and shows a dramatic counter reset animation

### 2b. Milestone Rewards
- Every 25 passengers: money bonus + screen celebration
- Every 50 passengers: unlock a random power-up (free shield, free SAM, speed boost)
- Every 100 passengers: "LEGENDARY" tier notification with screen-wide gold particle burst

### 2c. Challenge System
- Add `dailyChallenge` to GameState: randomized objectives like "Deliver 50 passengers without losing a station" or "Intercept 10 drones in one raid"
- Progress bar in TopBar; completion awards bonus money and an achievement badge
- 3-star rating system per scenario (based on score thresholds)

### 2d. Danger Escalation
- When stability drops below 30%: screen turns progressively red, heartbeat SFX plays, camera slightly zooms in (tension)
- When a station is about to overflow (7/8 passengers): pulsing red glow on that station, urgent beeping
- "Last Stand" mechanic: at 1 life, all defenses get +50% fire rate, trains get +25% speed (comeback mechanic)

## 3. Enhanced VFX & Graphics

**Files**: `Scene3D.tsx`, `ExplosionEffect.tsx`, `StationNode3D.tsx`, `index.css`

### 3a. Screen-Wide Impact Effects
- **Critical hit explosions**: When a Gerbera drone hits, add a brief white screen flash + radial shockwave ring that expands across the entire viewport
- **Combo celebration particles**: At milestone combos, emit a burst of colored particles (gold/green) from the score counter
- **Rain particles**: Replace the current flat rain overlay with actual falling particle instances in the 3D scene (lightweight instanced points)

### 3b. Station Glow & Pulse
- Healthy stations: soft green underglow
- Damaged stations: flickering orange/red glow with smoke particles
- Destroyed stations: persistent dark rubble + occasional ember particles
- Shield active: visible dome mesh with animated fresnel shader

### 3c. Train Arrival Celebration
- When passengers are delivered: brief sparkle burst at station + the score floats up with a spring animation
- Screen edge flash in the line's color

### 3d. UI Juice
- **Number counters**: Animate score/money changes with rolling digit effect (already partially exists, enhance with spring physics)
- **Button press**: Add scale-down + bounce-back on all game buttons
- **Panel transitions**: Slide + fade for all panels instead of instant show/hide

## 4. Audio Overhaul

**File**: `AudioEngine.ts`, `core/AudioFeedback.ts`

### 4a. Adaptive Music System
- Replace static 4-note ambient drone with a **layered adaptive soundtrack**:
  - **Layer 1 (always)**: Low pad chord (changes with day/night)
  - **Layer 2 (active stations > 8)**: Rhythmic bass pulse
  - **Layer 3 (air raid)**: Tense high strings + staccato percussion
  - **Layer 4 (combo > 3)**: Upbeat arpeggios
- Each layer fades in/out based on game state, creating dynamic tension

### 4b. New SFX
- `playCashRegister()`: Satisfying "ka-ching" for money earned (short metallic ring + coin drop)
- `playHeartbeat()`: Low 60bpm pulse when lives ≤ 1
- `playComboBreak()`: Glass shatter + descending tone
- `playFeverMode()`: Rising synth sweep + sustained shimmer
- `playMilestone()`: Triumphant brass stab (3-note fanfare, different from playSuccess)
- `playStationOverflow()`: Urgent staccato alarm beeps
- Haptic feedback via `navigator.vibrate()` on mobile for explosions and critical events

## 5. Improved Tutorial & Onboarding

**Files**: `GameCanvas.tsx`, `GameEngine.ts`

- Replace the current invisible tutorial state machine with a **visual overlay system**:
  - Semi-transparent dark overlay with a "spotlight" cutout highlighting the target element
  - Instruction text in Ukrainian with arrow pointing to the element
  - "Далі" (Next) / "Пропустити" (Skip) buttons
  - Steps: Welcome → Pan camera → Click station → Buy train → Connect station → Build defense → Survive raid → Complete
- Add a **"Sandbox" mode**: No drones, infinite money — for learning mechanics stress-free
- First-time auto-zoom to starting stations

## 6. Quality-of-Life Improvements

**Files**: `GameEngine.ts`, `GameCanvas.tsx`, `ActionBar.tsx`

- **Auto-pause on tab switch** (visibility API)
- **Quick-restart button** always visible during gameplay (not just game over)
- **Undo last purchase** (within 3s window) — prevents accidental buys on mobile
- **Settings panel**: Volume slider, music toggle, SFX toggle, vibration toggle, language (future)
- **Mini-tutorial tooltips**: First time opening each action category, show a brief explanation overlay

---

## Technical Summary

| Area | Files Modified | Scope |
|------|---------------|-------|
| Mobile UI | GameCanvas, ActionBar, StationPanel, TrainPanel, TopBar, index.css | Layout, touch targets, bottom sheets |
| Gameplay | GameEngine, types, difficulty | Streak, milestones, challenges, danger escalation |
| VFX | Scene3D, ExplosionEffect, StationNode3D, index.css | Particles, glows, screen effects |
| Audio | AudioEngine, AudioFeedback | Adaptive music, 6+ new SFX, haptics |
| Tutorial | GameCanvas, GameEngine | Visual overlay system, sandbox mode |
| QoL | GameCanvas, ActionBar | Auto-pause, undo, settings |

All changes maintain the existing architecture pattern (pure systems in GameEngine, R3F rendering in Scene3D, memoized HUD components).

