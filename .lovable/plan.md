

# Grand Overhaul: Mobile UX, Advanced Gameplay, VFX & Animations

## Overview
Transform the game from a desktop-oriented experience into a polished, mobile-first game with advanced building mechanics, animated 3D models, enhanced VFX, richer passenger systems, and guided onboarding with animated tooltips.

---

## 1. Mobile-First UI Overhaul

**Files**: `GameCanvas.tsx`, `ActionBar.tsx`, `TopBar.tsx`, `StationPanel.tsx`, `TrainPanel.tsx`, `index.css`

- **TopBar**: On mobile (viewport < 768px), collapse to single compact row showing only score, money, lives, combo. Add a chevron to expand full stats as a dropdown overlay.
- **ActionBar → FAB Menu**: Replace the wide horizontal dock (unusable on mobile) with a floating action button (bottom-right corner) that opens a grid menu of 4 categories (Trains, Defense, Economy, Emergency). Each category opens a slide-up bottom sheet with 56x56px touch targets.
- **StationPanel / TrainPanel**: Render as bottom sheet drawers on mobile (slide up from bottom, swipe-down-to-dismiss via CSS transform). Keep current side-panel layout on desktop.
- **Start Screen**: Single-column layout on mobile — city selector as horizontal scroll strip, scenario cards stacked vertically, larger tap targets (min 48px).
- **Touch improvements**: Add `touch-action: none` to the game canvas container to prevent browser scroll interference.

## 2. Animated Building Construction & Damage

**Files**: `CityBuildings.tsx`, `GameEngine.ts`, `types.ts`

- **BuildingState**: Add `constructionProgress: number` (0-1), `constructionActive: boolean` fields. New buildings start at progress 0 and "grow" over 3 seconds.
- **Construction animation**: In `useFrame`, buildings with `constructionProgress < 1` render at reduced Y-scale (lerp from 0 to full height), with a scaffold wireframe overlay (transparent edges mesh) and rising dust particles.
- **Damage visualization**: Buildings between 50-100% HP show cracks (darkened color patches). Below 50% HP: flickering orange glow + active smoke particles. Below 25%: partial collapse (scale Y reduced to 60%, debris particles spawn).
- **Collision debris**: On drone impact near a building, spawn 10-15 instanced box debris particles with physics (gravity + random velocity), fading over 2 seconds. Use existing `debrisRef` pattern but increase count and add rotation.

## 3. Advanced 3D Model Animations

**Files**: `DroneModel.tsx`, `TrainModel.tsx`, `StationNode3D.tsx`, `Scene3D.tsx`

- **Spawn animations**: All 3D entities (drones, trains, repair units) get a spawn-in animation: scale from 0 → 1 with elastic easing over 0.5s + a "materialization" effect (opacity 0 → 1 with additive white flash).
- **Drone propeller animation**: Add `useFrame` rotation on propeller child nodes of GLB models (identify by name containing "prop" or "rotor"). Shahed: slow rotation. Molniya: fast. Gerbera: dual counter-rotating.
- **Drone projectile trails**: When drones approach within strike range, render a falling bomb mesh (small cylinder) that drops from drone to target with gravity arc + smoke trail particles.
- **Train boarding animation**: When passengers board/alight, animate small colored dots moving between the station platform and the train body (already partially exists — enhance with arc trajectory and more visible particle count).
- **Station pulse on interaction**: Clicking a station triggers a brief radial pulse ring (torus geometry, scale up + fade out over 0.3s).

## 4. Enhanced VIP & Special Passenger Mechanics

**Files**: `GameEngine.ts`, `types.ts`, `StationNode3D.tsx`

- **Passenger types**: Extend `Passenger` with `type: 'normal' | 'vip' | 'elderly' | 'student' | 'worker'`. Each has different patience, fare multiplier, and visual indicator.
- **VIP mechanics**: VIP passengers (gold star icon) pay 3x fare, but drones specifically target stations with VIPs. VIP delivery triggers a special celebration SFX + floating "+$30 VIP" score.
- **Elderly passengers**: Move slower (longer dwell time) but provide satisfaction bonus on delivery.
- **Student rush**: During rush hour, spawn clusters of student passengers (blue icons) that travel in groups and provide combo bonuses.
- **Passenger tracking**: Add `passengerTypes` counter to GameState tracking deliveries by type. Show breakdown in game-over stats.
- **Visual differentiation**: In `PassengerShape3D`, VIPs render with gold material + small crown mesh. Elderly render with silver. Students render with blue tint.

## 5. Animated Tutorial Tooltips & Onboarding

**Files**: `GameCanvas.tsx` (new `TutorialOverlay` component), `GameEngine.ts`

- **Visual overlay system**: Semi-transparent dark backdrop with a CSS `clip-path` spotlight circle highlighting the target UI element.
- **Animated arrow**: CSS arrow that bounces (up-down animation) pointing at the highlighted element. Arrow follows the element's position using refs.
- **Tutorial steps** (Ukrainian text):
  1. "Ласкаво просимо! Керуй транспортом міста" — highlight map center
  2. "Тягни камеру для огляду" — highlight map, wait for pan gesture
  3. "Натисни на станцію" — arrow points to nearest station, wait for click
  4. "Купи потяг" — arrow bounces on train button in ActionBar
  5. "Підключи нову станцію" — arrow points to pending station, wait for connection
  6. "Побудуй оборону" — arrow on defense button, wait for purchase
  7. "Виживи під атакою!" — remove overlay, first raid begins
- **Skip button**: "Пропустити" button always visible in corner.
- **Contextual tooltips**: First time each ActionBar category is opened, show a brief explainer tooltip (auto-dismiss after 4s). Track seen categories in state.

## 6. Enhanced VFX & Screen Effects

**Files**: `Scene3D.tsx`, `ExplosionEffect.tsx`, `StationNode3D.tsx`, `index.css`

- **Station health glow**: Healthy stations emit soft green point light (intensity 0.3). Damaged (<50% HP) switch to flickering orange. Destroyed: dark red ember glow.
- **Shield dome**: When shield is active, render a translucent icosahedron mesh over the station with animated opacity (sine wave shimmer).
- **Screen-wide impact flash**: On Gerbera drone hits, brief white fullscreen overlay (0.1s) + CSS radial shockwave ring expanding from hit point.
- **Fever mode visuals**: When fever is active, render a gold animated border (CSS box-shadow with animated inset glow) + subtle gold particle overlay.
- **Rain upgrade**: Replace flat CSS rain overlay with a 3D instanced points system (500 falling point particles) for more immersive weather.

## 7. Gameplay Interaction Improvements

**Files**: `GameEngine.ts`, `GameCanvas.tsx`, `ActionBar.tsx`

- **Auto-pause**: Use `document.visibilitychange` API to pause when tab is backgrounded. Add `tabVisible` state field.
- **Undo last purchase**: After any purchase, store action in `undoAction: { type, cost, timer }`. Show a 3-second "Скасувати" toast. If tapped, refund money and reverse action.
- **Quick-restart**: Always-visible restart button in TopBar during gameplay (not just game-over).
- **Double-tap station**: On mobile, detect double-tap on empty canvas area → select nearest station.
- **Settings**: Add a gear icon in TopBar that opens a slide-up panel with: SFX toggle, Music toggle, Vibration toggle (mobile only), volume slider. Persist in localStorage.

---

## Technical Summary

| Area | Files | Key Changes |
|------|-------|-------------|
| Mobile UI | ActionBar, TopBar, StationPanel, TrainPanel, GameCanvas, index.css | FAB menu, bottom sheets, compact TopBar, touch targets |
| Buildings | CityBuildings, GameEngine, types | Construction animation, damage stages, debris physics |
| 3D Animations | DroneModel, TrainModel, StationNode3D | Spawn-in effects, propeller rotation, projectile trails |
| Passengers | GameEngine, types, StationNode3D | 5 passenger types, VIP targeting, visual differentiation |
| Tutorial | GameCanvas (new component) | Spotlight overlay, animated arrows, 7-step guide |
| VFX | Scene3D, ExplosionEffect, index.css | Station glow, shield dome, impact flash, rain particles |
| QoL | GameEngine, GameCanvas, ActionBar | Auto-pause, undo, settings, double-tap |

All changes maintain existing architecture: pure state updates in GameEngine, R3F rendering in Scene3D components, memoized HUD layers. Performance budget: max 5 active point lights, instanced meshes for particles, throttled HUD updates.

