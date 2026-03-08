

# Phase 4: Visual Overhaul, Building Destruction, Night Fix, Gameplay Features

## Issues Identified

1. **Maidan/Khreshchatyk overlap**: `r11` (Khreshchatyk) at `(0.48, 0.42)` and `b8` (Maidan) at `(0.48, 0.42)` — identical coordinates. Need to offset one.
2. **Night = black**: Ambient light at night is `0.2` with `#2233aa` + hemisphere `0.12`. Buildings have no emissive. Everything vanishes. Need city lights, window glow, station glow boost.
3. **Drone models are basic gray cylinders** — need distinct silhouettes with delta wings (Shahed), swept wings (Molniya), larger body (Gerbera), plus engine trails.
4. **Buildings are plain untextured boxes** — need varied heights, window emissive rows, and destructibility system.
5. **QTE system is clunky** — replace with selectable drone outlines (click-to-target already exists, just remove QTE entirely).
6. **Only ~5 player actions exist** — need 10 more gameplay features.

## Plan (~12 files changed/created)

### 1. Fix Station Overlap (`constants.ts`)
- Move `b8` (Maidan) to `(0.47, 0.44)` and `r11` (Khreshchatyk) to `(0.49, 0.42)` — slight offset so labels don't stack.
- Also offset `g5` (Palats Sportu) from `(0.40, 0.40)` to `(0.39, 0.41)` and `r10` (Teatralna) from `(0.44, 0.42)` to `(0.43, 0.43)` — transfer cluster needs breathing room.

### 2. Fix Night Visibility (`Scene3D.tsx`)
- Increase night ambient from `0.2` to `0.35`, change color to `#4455aa`
- Increase night directional from `0.15` to `0.3` (moonlight)
- Increase hemisphere from `0.12` to `0.25`
- Ground color at night: `#0a1025` instead of `#050810`
- Buildings: add `emissive` window glow via material on `CityBuildings.tsx`

### 3. Enhanced CityBuildings with Window Glow & Destruction (`CityBuildings.tsx`)
- Keep InstancedMesh for performance
- Add emissive to material (warm yellow `#332200`) — all buildings glow faintly at night
- Add a second InstancedMesh layer for "window" planes on building faces (flat quads with emissive)
- Track building destruction state: new `BuildingState[]` in GameState with `hp`, `isDestroyed`, `isHalfDestroyed`
- Drones have 30% chance to hit a building instead of station — reduces building HP, visually scales Y down to half when half-destroyed, removes instance when fully destroyed

### 4. Building Destruction System (`types.ts`, `GameEngine.ts`)
- Add `buildings: BuildingState[]` to GameState (id, x, y, hp, maxHp, isDestroyed)
- Generate building positions deterministically (same as CityBuildings)
- In `updateDrones`: when drone reaches target, 30% chance it deviates to nearest building instead
- Destroyed buildings: set scale Y to 0 in InstancedMesh, add debris particles
- Half-destroyed: scale Y to 50%, change color to darker

### 5. Improved Drone Models (`DroneModel.tsx`)
- **Shahed**: Delta-wing shape — tapered fuselage (cone + cylinder), angled delta wings (rotated boxes), rear stabilizer fins, bright orange engine exhaust with pulsing pointLight
- **Molniya**: Slim fast shape — narrow cylinder body, swept-back thin wings, small canards, blue-white engine trail
- **Gerbera**: Heavy bomber — thick fuselage, large straight wings, twin engine pods under wings, red pulsing glow, visible payload bulge underneath
- All get subtle engine particle trail (small spheres that fade behind)
- Remove QTE ring; add **selectable outline** — when hovered, show wireframe outline mesh slightly larger than drone body
- Add red selection ring when targeted by player

### 6. Remove QTE, Add Drone Selection System (`GameEngine.ts`, `GameCanvas.tsx`)
- Remove `qteActive`, `qteDroneId`, `qteKey`, `qteTimer` logic entirely
- Replace with: clicking a drone during air raid = select it, then auto-fire from nearest anti-air station deals damage over time
- If no anti-air station: manual click costs 5 money per hit (already exists)
- Anti-air stations auto-target selected drone with visible tracer line
- Add `selectedDroneId: string | null` to GameState

### 7. Ten New Gameplay Features

**Feature 1: Power Grid** — Stations consume power. Add `powerGrid: number` to state (starts at 100). Each active station drains power. If power hits 0, random stations shut down. Player can buy generators (50 money).

**Feature 2: Rush Hour Events** — Every 90s, passenger spawn rate triples for 15s. Warning banner appears 5s before. Adds tension between raids.

**Feature 3: Bridge Vulnerability** — Stations crossing the river (r13 Dnipro, r14 Hidropark) get double damage from drones. Visual: bridge segments glow red when under attack.

**Feature 4: Station Shelters** — Deep stations can shelter civilians during raids. Clicking "Shelter" during air raid stops passenger spawning but protects existing passengers. Costs nothing but reduces income.

**Feature 5: Emergency Speed Boost** — Pay 20 money to boost all trains on one line to 2x speed for 10 seconds. Cooldown 30s.

**Feature 6: Decoy Station** — Place a decoy (40 money) that attracts drones away from real stations. Lasts 20 seconds or until hit.

**Feature 7: Combo Multiplier Rewards** — At combo x3, x4, x5: unlock bonus money, temporary speed boost, extra life respectively. Visual fanfare.

**Feature 8: Station Interconnect** — Upgrade transfer stations to allow passengers to auto-route between lines (already partially implemented, but make it visible with a transfer animation).

**Feature 9: Emergency Tunnel Seal** — Close a line section between two stations to prevent fire spread. Costs 15 money, lasts 15s.

**Feature 10: Drone Early Warning** — Spend 60 money on radar. Shows incoming drones 5 seconds before they appear on map as blinking dots at map edge.

### 8. Animations & Visual Polish
- Station pulse animation when passengers arrive (scale bounce already exists via jelly, keep it)
- Train smooth acceleration/deceleration curves (already easeInOutQuad, good)
- Drone engine trails: 3-4 small fading spheres behind each drone updated per frame
- Building destruction particles: when building is hit, spawn 6-8 small box fragments that fall with gravity
- Air raid: subtle red vignette overlay on screen edges (CSS)
- Night: warm window glow on buildings pulsing slightly
- Combo milestone: brief golden flash overlay

### 9. File Change Summary

| File | Changes |
|------|---------|
| `constants.ts` | Fix overlapping station coords |
| `types.ts` | Add `BuildingState`, `selectedDroneId`, `powerGrid`, `rushHourTimer`, `radarActive`, remove QTE fields |
| `GameEngine.ts` | Remove QTE system, add building destruction, power grid, rush hour, decoy, radar, emergency boost, tunnel seal |
| `CityBuildings.tsx` | Emissive windows, destruction rendering via state, night glow |
| `DroneModel.tsx` | Rebuild all 3 drone types with distinct wings/trails, add selection outline, remove QTE ring |
| `Scene3D.tsx` | Fix night lighting values, pass building state |
| `GameCanvas.tsx` | Remove QTE UI, add new action buttons, red vignette during raids, combo milestone flash |
| `StationPanel.tsx` | Add shelter, emergency boost, tunnel seal, decoy buttons |
| `ActionBar.tsx` | Add generator, radar, decoy purchase buttons |
| `TopBar.tsx` | Add power grid indicator, rush hour warning, radar status |
| `config/difficulty.ts` | Add rush hour timing config |

Approximately 11 files modified, 0 new files. Gameplay features are additive — no architecture changes needed.

