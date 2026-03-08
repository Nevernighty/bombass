

# Phase 20: Visual Train Upgrades, Line Drawing, VIP Hunts & Gameplay Depth

## Summary

This phase addresses 5 user requests: (1) train upgrades should visually change trains, (2) new stations appear grey and require manual line-drawing to connect, (3) unconnected stations still spawn passengers causing overflow/gameover pressure, (4) train purchase has better spawn animation, (5) drones prioritize VIP passengers, plus more gameplay events like VIP.

## Current State

- **Train upgrades** (`upgradeTrainCapacity`) only increase `capacity` and `level` — wagon chain renders extra wagons but all look identical. No visual differentiation (color, glow, size changes).
- **New stations** auto-unlock via `updateProgression()` — they silently get added to `activeStationIds` with no player input. Passengers immediately spawn there. No grey/unconnected state.
- **VIP passengers** exist in events but drones don't target them specifically.
- **Train purchase** (`purchaseTrain`) just pushes a new train object — no spawn animation/effect.
- **Line drawing** doesn't exist at all — Mini Metro's core mechanic is absent.

## Plan — 6 files

### 1. `types.ts` — New State Fields
- Add `pendingStations: string[]` — stations revealed but not yet connected (grey, spawning passengers)
- Add `isDrawingLine: boolean`, `drawLineFrom: string | null`, `drawLineTo: string | null` — for line-drawing interaction
- Add `trainSpawnEffects: { id: string; x: number; y: number; timer: number; line: string }[]` — spawn flash effects
- On `Train`: add `wagonUpgradeLevel: number` (alias of level, used for visual differentiation)

### 2. `GameEngine.ts` — Core Mechanics Changes

**Station Unlocking → Pending Stations:**
- `updateProgression()`: instead of adding to `activeStationIds`, add to `pendingStations`
- New function `connectStation(state, stationId, fromStationId)`: player draws a line from an active station to a pending one → moves it to `activeStationIds`. Free action, just requires the click-drag.
- Pending stations still spawn passengers (they're visible, grey, passengers queue up → overflow causes gameover if ignored).

**VIP Drone Targeting:**
- In `updateCrisis()` drone spawn: if any VIP passenger exists on a station, 40% chance the new drone targets that station instead of random.
- Add VIP delivery bonus: 5x score multiplier when VIP delivered.

**Train Purchase Animation:**
- `purchaseTrain()`: push a spawn effect to `trainSpawnEffects[]` with 1.5s timer.

**More Event Types:**
- Add "tunnel_flood" event: one random tunnel segment closes for 20s
- Add "power_surge" event: all stations get +10 HP

### 3. `TrainModel.tsx` — Visual Upgrade Differentiation

Level-based visual changes:
- **Level 1**: Base model, standard line color tint (current)
- **Level 2**: Brighter emissive (0.6), slightly larger scale (0.45), gold accent stripe (extra mesh plane on top), +1 wagon
- **Level 3**: Maximum emissive (0.9), largest scale (0.5), gold + white stripes, glow point light 2x intensity, +2 wagons, particle trail (small spheres behind)

Spawn animation: if train has matching `trainSpawnEffects` entry, play scale-up from 0 to 1 with bounce over 1.5s.

### 4. `StationNode3D.tsx` — Grey Pending Stations

- Check if station is in `pendingStations` (not `activeStationIds`)
- If pending: render in **grey** with low emissive, pulsing "connect me" ring, dashed outline
- Still show passenger queue (they spawn!) with grey-tinted shapes
- On hover: show tooltip "Проведи лінію щоб підключити"

### 5. `GameCanvas.tsx` — Line Drawing Interaction

- Track `isDrawingLine` state: when user clicks a station that's at the end of a line (last active station on any line), start drawing
- On mouse move while drawing: show a visual line from source station to cursor (HTML overlay or just track coordinates)
- On clicking a pending station while drawing: call `connectStation()`, cancel draw mode
- On clicking elsewhere: cancel draw mode
- Also render `trainSpawnEffects` as radial flash overlay at world coordinates
- Add new event types to the event banner configs

### 6. `Scene3D.tsx` — Draw Line Visual

- When `isDrawingLine` is true, render a temporary 3D line from the source station to cursor world position (using a simple line geometry or tube)

## Key Behaviors

```text
Station Unlock Flow:
  Timer fires → station added to pendingStations (grey)
  → Passengers start spawning there (pressure!)
  → Player drags line from nearest active station
  → Station moves to activeStationIds (colored, connected)
  → If ignored: overflow → gameover

Train Upgrade Visual:
  Lv1: [===]  standard
  Lv2: [===][===]  brighter, gold stripe, 0.45 scale
  Lv3: [===][===][===]  glowing, particles, 0.5 scale

VIP Drone Priority:
  VIP spawns at station → 40% of new drones target that station
  → Player must defend or deliver VIP quickly
  → VIP delivery = 5x points
```

## File Summary

| File | Change |
|------|--------|
| `types.ts` | Add `pendingStations`, `isDrawingLine`, `drawLineFrom`, `trainSpawnEffects` |
| `GameEngine.ts` | Pending station system, `connectStation()`, VIP drone targeting, VIP delivery bonus, train spawn effects, new events |
| `TrainModel.tsx` | Level-based visual changes (scale, emissive, stripes, particles), spawn animation |
| `StationNode3D.tsx` | Grey rendering for pending stations, "connect me" pulse |
| `GameCanvas.tsx` | Line drawing interaction (click-drag from active to pending), spawn effect overlay, new event configs |
| `Scene3D.tsx` | Temporary 3D draw line visual |

