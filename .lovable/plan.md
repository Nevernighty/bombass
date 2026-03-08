

# Deep Audit & Redesign Plan — Kyiv Transit: Resilience

---

## 1. SYSTEM MAP

```text
┌─────────────────────────────────────────────────────┐
│                    GameCanvas.tsx                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ HUD/UI   │  │ Input     │  │ Canvas (R3F)     │  │
│  │ (inline) │  │ handlers  │  │  ┌────────────┐  │  │
│  │          │  │ (inline)  │  │  │ Scene3D    │  │  │
│  └──────────┘  └───────────┘  │  │  ├CameraCtrl│  │  │
│       ▲                       │  │  ├GameLoop  │  │  │
│       │ setHudState()         │  │  ├MetroLine │  │  │
│       │                       │  │  ├Station3D │  │  │
│  ┌────┴──────┐                │  │  ├TrainModel│  │  │
│  │ stateRef  │◄───────────────│  │  ├DroneModel│  │  │
│  │ (mutable) │                │  │  ├Explosions│  │  │
│  └───────────┘                │  │  ├Buildings │  │  │
│       ▲                       │  │  └River     │  │  │
│       │ updateGame()          │  └────────────┘  │  │
│  ┌────┴──────┐                └──────────────────┘  │
│  │GameEngine │                                       │
│  │  (pure fn)│                                       │
│  └───────────┘                                       │
│  ┌───────────┐  ┌───────────┐                        │
│  │ constants │  │AudioEngine│                        │
│  └───────────┘  └───────────┘                        │
└─────────────────────────────────────────────────────┘
```

**File inventory**: 1 engine file (721 lines), 1 canvas/HUD file (482 lines), 1 scene file (257 lines), 7 component files, 1 constants file, 1 types file, 1 audio file.

---

## 2. CRITICAL ISSUES FOUND

### A. Architecture Problems

1. **God-function `updateGame()`** — 410 lines handling passengers, trains, drones, QTE, explosions, surface vehicles, fire, shields, notifications, day/night, all in one function. Impossible to test, extend, or debug individual systems.

2. **Mutable state pattern** — `stateRef.current` is mutated directly in multiple places (`handleStationHover` line 81 mutates directly, `handleStationClick` line 68 mutates then spreads). The `updateGame` function creates a shallow copy `{...state}` but then mutates nested arrays/objects (e.g., `station.passengers.splice(0, space)` on line 260). This is NOT immutable — it's shared mutation through references.

3. **Simulation coupled to rendering** — `GameLoop` component runs `updateGame()` inside `useFrame`, meaning simulation speed is tied to frame rate. At 30fps the game runs differently than at 60fps (dt is clamped to 50ms but accumulation differs).

4. **HUD re-renders via `setHudState({...state})`** — Every 150ms the entire HUD re-renders by spreading the full state. This triggers React reconciliation on the entire HUD tree including all buttons, even when nothing relevant changed.

5. **No event system** — Audio calls (`audio.playExplosion()`) are hardcoded inline in game logic. Adding new feedback (screen flash, notification, achievement) requires editing GameEngine directly.

### B. Performance Bottlenecks

1. **120 individual building meshes** — Each is a separate draw call. Should be a single `InstancedMesh`.
2. **`STATIONS.find()` called ~50+ times per frame** — In `updateGame`, `TrainModel`, `DroneModel`, `StationNode3D`, `MetroLine3D`. Linear search over 49 stations repeatedly.
3. **`getActiveLineStations()` filters entire STATIONS array every call** — Called 3x per frame in MetroLine3D, plus in train logic.
4. **10 explosion groups with 22 children each = 220 meshes** always in scene graph, just hidden.
5. **`Text` components from drei** — Each station has 2 `Text` elements + passengers have orbiting meshes = ~100+ text renderers. Text uses SDF rendering which is expensive at scale.
6. **Scene `tick` state** — `setTick(t => t + 1)` every 250ms causes full SceneContent re-render, recreating `trainIds`, `droneIds` arrays, triggering child reconciliation.

### C. Scaling Risks

1. **Global `nextId` counter** — `let nextId = 0` at module scope. Not deterministic across restarts. Will collide if game state is serialized/deserialized.
2. **No station lookup index** — As stations scale from 49 to 100+, `find()` becomes O(n) bottleneck.
3. **Train route calculation** — `getActiveLineStations` filters + maps every frame per train. With 20+ trains, this is O(trains × stations).
4. **No passenger routing** — Passengers have a destination shape but no concept of which line to take. No transfer logic. Passengers just ride until they happen to reach a matching station.

### D. Missing Abstractions

1. No **event bus** — simulation should emit events (`PASSENGER_DELIVERED`, `DRONE_HIT`, `STATION_DESTROYED`), listeners handle audio/VFX/notifications.
2. No **system registry** — each subsystem (trains, drones, passengers, fire, shields) is interleaved code in one function.
3. No **config layer** — difficulty scaling is hardcoded formulas (`Math.max(1500, INTERVAL - elapsed * 0.008)`).
4. No **save/load** — no serialization.
5. No **deterministic tick** — simulation uses `Math.random()` without seeding.

---

## 3. GAMEPLAY LOOP REDESIGN

### Primary Loop (Transit Optimization)
```text
Passengers spawn → Player manages trains/routes → Passengers delivered → Score/Money
     ↑                                                                        │
     └──── New stations unlock ◄──── Upgrade infrastructure ◄────────────────┘
```

### Secondary Loop (Crisis Disruption)
```text
Calm phase → Warning (siren) → Air raid → Drones attack → Player defends
     ↑                                                          │
     └──── Recovery ◄── Repair/Rebuild ◄── Damage assessment ◄─┘
```

### Decision Points (currently weak — recommendations)
- **Route planning**: Let players draw/reassign train routes between stations (Mini Metro style) instead of auto-pathing
- **Resource allocation**: Choose between upgrading capacity vs defense vs speed
- **Triage during raids**: Which stations to shield vs evacuate vs sacrifice
- **Transfer management**: Manually manage passenger transfers at interchange stations

### Failure Conditions
1. Lives reach 0 (station overflow or destruction)
2. Network collapses (all lines disconnected)
3. *New*: Passenger patience — passengers leave after waiting too long, reducing score multiplier

### Difficulty Ramp
- Wave 1-3: Shahed only, long calm periods, 2 lines active
- Wave 4-6: Mix drone types, shorter calm, all 3 lines, passenger spawn accelerates
- Wave 7+: Simultaneous multi-front attacks, infrastructure degradation, power outages

### Replayability
- Seeded random for shareable runs
- Unlockable scenarios (rush hour, blackout, bridge failure)
- Score leaderboard per scenario
- Unlockable starting configurations

---

## 4. RECOMMENDED ARCHITECTURE

### Target Structure
```text
src/game/
  core/
    GameState.ts        — state type + createInitialState
    GameLoop.ts         — fixed-timestep tick runner
    EventBus.ts         — typed event emitter
  systems/
    PassengerSystem.ts  — spawn, route, patience
    TrainSystem.ts      — movement, dwell, load/unload
    DroneSystem.ts      — spawn, move, hit detection
    CrisisSystem.ts     — air raid scheduling, wave logic
    RepairSystem.ts     — DSNS units, fire, HP
    ProgressionSystem.ts— station unlock, difficulty ramp
    EconomySystem.ts    — money, upgrades, costs
  config/
    stations.ts         — station data table
    lines.ts            — line configs
    drones.ts           — drone type configs
    difficulty.ts       — wave/difficulty curves
    costs.ts            — economy balance table
  render/
    Scene3D.tsx         — scene composition
    CameraController.tsx
    MetroLine3D.tsx
    StationNode3D.tsx
    TrainModel.tsx
    DroneModel.tsx
    ExplosionEffect.tsx
    CityBuildings.tsx
    RiverPlane.tsx
  ui/
    HUD.tsx
    StationPanel.tsx
    ActionBar.tsx
    QTEOverlay.tsx
    StartScreen.tsx
    GameOverScreen.tsx
  audio/
    AudioEngine.ts
    AudioFeedback.ts    — listens to EventBus, plays sounds
```

### Simulation Tick System
```typescript
// Fixed timestep: simulation runs at 60 ticks/sec regardless of framerate
const TICK_MS = 16.67;
function runSimulation(state: GameState, realDt: number, events: EventBus): GameState {
  let acc = state._accumulator + realDt;
  while (acc >= TICK_MS) {
    state = passengerSystem(state, TICK_MS, events);
    state = trainSystem(state, TICK_MS, events);
    state = droneSystem(state, TICK_MS, events);
    state = crisisSystem(state, TICK_MS, events);
    state = repairSystem(state, TICK_MS, events);
    state = progressionSystem(state, TICK_MS, events);
    acc -= TICK_MS;
  }
  state._accumulator = acc;
  return state;
}
```

---

## 5. MINIMAL SAFE REFACTOR PLAN

Given the constraint to work incrementally, here's the priority order:

### Phase 1: Critical Fixes (immediate)
1. **Build station lookup map** — `Map<string, GameStation>` indexed by ID, eliminate all `find()` calls
2. **Cache active line stations** — compute once per tick, store in state, not per-component
3. **InstancedMesh for buildings** — replace 120 individual meshes with 1 `InstancedMesh`
4. **Remove SceneContent tick state** — use refs instead of `setTick` to avoid re-renders
5. **Extract HUD into memoized sub-components** — `TopBar`, `StationPanel`, `ActionBar` with selective prop passing

### Phase 2: Simulation Separation (next)
6. **Extract train update into `updateTrains()`** — pure function, testable
7. **Extract drone update into `updateDrones()`** — pure function
8. **Extract passenger spawn into `updatePassengers()`** — pure function
9. **Add EventBus** — simulation emits events, GameCanvas subscribes for audio/VFX
10. **Move audio calls out of GameEngine** — AudioFeedback listener

### Phase 3: Gameplay Depth (after stabilization)
11. **Passenger patience timer** — passengers leave if waiting > threshold
12. **Wave-based crisis system** — structured waves with escalating difficulty
13. **Click-to-target drones** — direct interaction beyond QTE
14. **Transfer station logic** — passengers reroute through interchange stations

### Phase 4: Performance Polish
15. **Fixed-timestep simulation** — decouple from framerate
16. **Seeded RNG** — deterministic runs
17. **Throttle HUD updates** — only update changed fields via selective comparison
18. **LOD for distant stations** — hide text/passengers when zoomed out

---

## 6. PERFORMANCE OPTIMIZATION PLAN

| Issue | Fix | Impact |
|-------|-----|--------|
| 120 building draw calls | `InstancedMesh` | -119 draw calls |
| `STATIONS.find()` ~50x/frame | `Map<id, station>` | O(1) lookup |
| `getActiveLineStations` 3x/frame | Cache in state | -3 array filters/frame |
| `setTick` re-renders scene | Remove, use refs | Eliminate 4 re-renders/sec |
| 220 explosion child meshes | Object pool, lazy create | -200 inactive nodes |
| `setHudState({...state})` | Selective field comparison | -80% HUD re-renders |
| Text SDF per station | Hide when zoomed out | -50 text renders when zoomed |
| Shadow map 1024x1024 | 512x512 on mobile | GPU savings |
| `Math.random()` in simulation | Seeded PRNG | Deterministic + debuggable |

---

## 7. DATA-DRIVEN CONVERSION

Currently hardcoded systems that should be config tables:

```typescript
// config/difficulty.ts
export const DIFFICULTY_CURVE = {
  waves: [
    { startTime: 0, spawnRate: 3000, droneTypes: ['shahed'], raidDuration: 20000, calmMin: 50000, calmMax: 90000 },
    { startTime: 60000, spawnRate: 2500, droneTypes: ['shahed', 'molniya'], raidDuration: 25000, calmMin: 40000, calmMax: 70000 },
    { startTime: 180000, spawnRate: 2000, droneTypes: ['shahed', 'molniya', 'gerbera'], raidDuration: 30000, calmMin: 30000, calmMax: 50000 },
  ],
  passengerSpawnBase: 3000,
  passengerSpawnMinimum: 800,
  passengerSpawnAcceleration: 0.01,
};

// config/scenarios.ts  
export const SCENARIOS = {
  rush_hour: { startStations: 'all', passengerMultiplier: 3, crisisEnabled: false, winCondition: { delivered: 200 } },
  heavy_raid: { startStations: 'all', raidInterval: 15000, droneSpawnRate: 1500, winCondition: { survive: 300000 } },
  blackout: { nightOnly: true, trainSpeedMultiplier: 0.5, winCondition: { delivered: 100 } },
};
```

---

## 8. MOBILE OPTIMIZATION

- Touch: already implemented (pinch-zoom, pan). Needs: tap-to-select station (current click works), long-press for context menu
- HUD: bottom action bar is good. Station panel should slide up from bottom on mobile instead of fixed position
- Performance: cap buildings at 60 on mobile, disable shadows, reduce fog distance, hide station text when >8 stations visible
- Camera: add double-tap to center on tapped station

---

## 9. TUTORIAL DESIGN

1. **Wave 1**: Only red line, 2 stations. Tooltip: "Passengers need to reach matching shapes." Auto-highlight matching station.
2. **Wave 2**: Blue line activates. Tooltip: "Buy trains to serve new lines."
3. **Wave 3**: First air raid. Tooltip: "Press the shown key to intercept!" QTE appears with slower timer.
4. **Wave 4**: Station damaged. Tooltip: "Click damaged stations to dispatch repair."
5. **After Wave 4**: Full game, no more tooltips. All learned through play.

---

## 10. IMPLEMENTATION PRIORITY

For the next coding session, I recommend **Phase 1** (fixes 1-5) as it:
- Requires no architecture changes
- Immediately improves performance
- Reduces bugs (station lookups)
- Makes future refactoring easier

Estimated: ~5 file edits, no new files, no API changes.

