

# Phase 5: Grand Overhaul — Graphics, UI, 20+ Gameplay Features, Game Modes

## Current State Assessment

The game has a solid foundation with 3 metro lines, 49 stations, building destruction, 3 drone types, power grid, rush hour, decoys, radar, shelters, tunnel seals, and combo rewards. However:

- **Graphics**: Buildings are plain instanced boxes, river is a flat tube, ground is a flat plane, no skybox, no clouds, no streetlights, no particles beyond explosions
- **UI**: Functional but bare — no minimap, no tutorial, no score popups, no progress bars on cooldowns, no visual feedback for many actions
- **Gameplay**: ~15 actions exist but no alternative game modes, no win conditions beyond survival, no achievements, no leaderboard, no persistent progression

## Plan (11 files modified, 4 new files)

### 1. Enhanced 3D City Graphics

**CityBuildings.tsx** — Complete rewrite:
- Buildings get procedural "window rows": second InstancedMesh with small emissive quads on building faces, warm yellow at night, cool blue during day
- Damaged buildings: rubble particle system (6 small boxes that scatter with gravity when building takes damage)
- Half-destroyed buildings show jagged top edge (scale Y to damage ratio, darken color progressively)
- Add streetlight poles: thin cylinder + small emissive sphere between buildings along metro lines, ~40 instances via InstancedMesh

**Scene3D.tsx** — Environment overhaul:
- Replace flat ground with subtle terrain: very slight undulation using a displacement-mapped plane
- Add procedural cloud layer: 8 flat billboard planes at Y=35 with semi-transparent white, slowly drifting
- Add skybox gradient: hemisphere from dark blue (zenith) to city-glow orange (horizon) at night, blue-to-white during day
- Fog adjustments: near=80, far=200 for more depth
- Add ambient particles: 30 firefly-like dots floating slowly (tiny emissive spheres in a slowly-rotating group)

**RiverPlane.tsx** — Better water:
- Add animated UV offset for flow effect using shader material or slowly shifting vertices
- Add slight transparency variation for depth illusion
- River banks: thin dark strips on either side of the tube

### 2. UI Overhaul (20 New Interactive Features)

**New file: `src/game/ui/Minimap.tsx`**
- 200x160px canvas in bottom-right corner showing full metro network
- Colored dots for stations (red/blue/green), moving dots for trains, red triangles for drones
- Click minimap to pan camera to that location
- Semi-transparent dark background, yellow border during air raid

**New file: `src/game/ui/AchievementToast.tsx`**
- Pop-up notification for achievements: "First 100 Passengers", "Drone Ace (10 drones)", "Survivor (5 min)", etc.
- Slide in from right, auto-dismiss after 3s
- Golden border, icon + text

**New file: `src/game/ui/ProgressRing.tsx`**
- Reusable SVG ring component for cooldown indicators on ActionBar buttons
- Shows remaining time as arc fill around button

**TopBar.tsx** — Enhanced stats:
- Add day/night cycle indicator (sun/moon icon with position on arc)
- Add passenger satisfaction meter (based on abandoned ratio)
- Add buildings intact counter
- Tooltip on hover for each stat explaining what it means

**ActionBar.tsx** — Major expansion with 10 new buttons:
1. **Emergency Brake** (10💰) — Stop all trains for 5s, prevents crashes during chaos
2. **Double Fare** (15💰) — 2x score per delivery for 15s, cooldown 45s
3. **Express Line** (35💰) — One line runs at 3x speed, skip intermediate stations for 20s
4. **Blackout Mode** (0💰) — Toggle lights off to make drones miss more (30% miss chance), but passengers spawn slower
5. **Signal Flare** (8💰) — Reveal all drone targets for 10s (shows lines from drones to their targets)
6. **Passenger Airdrop** (25💰) — Spawn 3 passengers at every active station immediately (money boost opportunity)
7. **Train Merge** (0💰) — Combine 2 trains on same line into one with doubled capacity
8. **Station Magnet** (20💰) — One station attracts 2x passengers for 20s (for farming score)
9. **Drone Jammer** (45💰) — Slow all drones by 50% for 15s
10. **Emergency Fund** (0💰) — Sacrifice 1 life for 80💰

**StationPanel.tsx** — Enhanced with:
- Visual HP bar with gradient (green → yellow → red)
- Passenger list preview (show shapes as colored dots)
- Station income tracker (passengers delivered from this station)
- Quick-action hotkeys shown next to each button

**GameCanvas.tsx** — New overlays:
- Floating damage numbers that drift upward and fade (already partially exists via notifications, enhance with scale animation)
- Score ticker animation when combo increases
- Screen border pulse (blue for shield, orange for fire, green for delivery milestone)
- Keyboard shortcut overlay (press H to toggle)
- Statistics sidebar (press Tab to toggle) showing detailed per-line metrics

### 3. Game Modes

**New file: `src/game/config/scenarios.ts`**

**Mode 1: Classic Survival** (current default)
- Endless, escalating waves, score-based

**Mode 2: Rush Hour Challenge**
- 5 minutes, no raids, 3x passenger spawn from start
- Win condition: deliver 300 passengers
- All stations and 6 trains unlocked from start

**Mode 3: Siege Mode**
- Continuous air raids from the start (no calm periods)
- Start with 5 lives and 200💰
- Win condition: survive 10 minutes
- Score multiplied by remaining lives

**Mode 4: Blackout**
- Permanent night, power drains 3x faster
- Only deep stations visible (shallow stations hidden on minimap)
- Win condition: deliver 150 passengers without losing a station

**Mode 5: Bridge Defense**
- Only red line active (crosses Dnipro)
- All drones target bridge stations (r13, r14)
- Win condition: keep both bridge stations alive for 8 minutes
- Start with extra anti-air budget

Start screen gets a mode selector: 5 cards with mode name, description, best score, and difficulty stars.

### 4. New Gameplay Systems in GameEngine.ts

Add to `types.ts`:
```
gameMode: 'classic' | 'rush_hour' | 'siege' | 'blackout' | 'bridge_defense';
achievements: string[];
satisfactionRate: number;
doubleFareTimer: number;
expressLineId: string | null;
expressTimer: number;
blackoutMode: boolean;
signalFlareTimer: number;
droneJammerTimer: number;
emergencyBrakeTimer: number;
stationMagnetId: string | null;
stationMagnetTimer: number;
bestScores: Record<string, number>;
```

Add 10 new action functions to GameEngine.ts:
- `emergencyBrake`, `activateDoubleFare`, `activateExpressLine`, `toggleBlackout`, `activateSignalFlare`, `passengerAirdrop`, `mergeTrains`, `activateStationMagnet`, `activateDroneJammer`, `emergencyFund`

Update `updateGame` to process new timers and effects.

### 5. Achievement System

Track in state, check after each tick:
- "Перший рейс" — Deliver first passenger
- "Сотня" — 100 passengers delivered
- "Тисяча" — 1000 passengers delivered  
- "Снайпер" — 10 drones shot manually
- "Неруйнівний" — Survive 5 minutes without losing a station
- "Комбо Майстер" — Reach combo x5
- "Повна лінія" — Unlock all stations on one line
- "Три лінії" — Have trains on all 3 lines
- "Економіст" — Accumulate 500💰
- "Рятівник" — Repair 5 stations

### 6. File Change Summary

| File | Changes |
|------|---------|
| `types.ts` | Add gameMode, achievements, 10 new timer fields |
| `GameEngine.ts` | Add 10 action functions, achievement checks, mode-specific logic, new system timers |
| `constants.ts` | Add achievement definitions, mode configs |
| `CityBuildings.tsx` | Window glow InstancedMesh, streetlights, rubble particles |
| `Scene3D.tsx` | Cloud layer, skybox gradient, ambient particles, better fog |
| `RiverPlane.tsx` | Animated flow, bank strips |
| `GameCanvas.tsx` | Mode selector on start screen, achievement toasts, new keyboard shortcuts, statistics overlay, screen border effects |
| `TopBar.tsx` | Day/night arc, satisfaction meter, buildings counter |
| `ActionBar.tsx` | 10 new action buttons with cooldown rings |
| `StationPanel.tsx` | Enhanced HP bar, passenger preview, income tracker |
| `config/difficulty.ts` | Mode-specific wave configs |
| **NEW** `ui/Minimap.tsx` | Corner minimap with click-to-pan |
| **NEW** `ui/AchievementToast.tsx` | Achievement pop-up component |
| **NEW** `ui/ProgressRing.tsx` | SVG cooldown ring component |
| **NEW** `config/scenarios.ts` | 5 game mode definitions |

~15 files total. This is a massive update but all additive — no breaking changes to existing architecture.

