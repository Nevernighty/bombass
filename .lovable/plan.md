

# Phase 6: Mega Overhaul — Performance, Camera, Anti-Air, Destruction, Polish

## Problems Identified

1. **Minimap is redundant** — the whole view IS the map. Remove it. Replace with camera follow/angle controls.
2. **Camera is locked isometric** — no rotation, no follow-train mode, no cinematic angles. Needs multiple camera modes.
3. **Anti-air is too limited** — only station-based AA + manual click. Need SAM batteries, interceptor drones, AA turrets with visible projectiles.
4. **Building destruction is invisible** — buildings just scale down. Need rubble meshes, dust clouds, fire, half-destroyed geometry.
5. **Station overlap still bad** — Maidan/Khreshchatyk/Teatralna cluster too tight.
6. **Night makes everything too dark still** — buildings lack proper emissive, no street-level lighting.
7. **Drone models are procedural but crude** — need better proportions, animated propellers/wings, visible warhead glow.
8. **Action bar is overwhelming** — too many small buttons crammed together. Need categorized tabs or radial menu.
9. **Performance lag** — SignalFlareLines creates new geometries every frame, cloud/particle systems not optimized.
10. **Console errors** — React.memo refs on TopBar/ActionBar warning.

## Changes (~12 files)

### 1. Remove Minimap, Add Camera Modes (`GameCanvas.tsx`, `Scene3D.tsx`)
- Delete Minimap import and usage
- Add camera mode selector: **Free** (current), **Follow Train** (tracks selected train), **Overview** (zoomed out full map), **Cinematic** (slow orbit)
- Follow Train: camera smoothly tracks selected train's world position, maintains current zoom
- Add camera rotation with right-click drag (rotate around lookAt point)
- Add keyboard shortcuts: F = follow selected, O = overview, C = cinematic
- Camera buttons: small vertical toolbar on right side replacing zoom-only controls

### 2. Better Camera Controller (`Scene3D.tsx`)
- Add `cameraMode: 'free' | 'follow' | 'overview' | 'cinematic'` to GameState
- Free: current behavior (pan + zoom)
- Follow: `lookAt` and position track the selected train's world coords, maintain zoom
- Overview: fixed high zoom-out showing entire map
- Cinematic: slowly orbit around map center, good for idle/attract mode
- Add orbit angle state for right-click rotation in free mode

### 3. Advanced Anti-Air System (`GameEngine.ts`, `Scene3D.tsx`)
- **SAM Battery** (120💰): Placed at station, auto-targets nearest drone within range 0.2, fires every 2s, deals 1 damage, visible tracer line from station to drone
- **Interceptor Drone** (80💰): Launches from any station, chases nearest enemy drone, destroys on contact, single-use
- **AA Turret** (60💰): Cheaper version of AA, lower range (0.1), but fires faster (every 1s)
- Add `TracerLines` component to Scene3D — renders brief line segments from AA stations to targeted drones (fade over 500ms)
- Add `InterceptorDrone` entities to GameState — friendly drones that chase enemy drones

### 4. Building Destruction Overhaul (`CityBuildings.tsx`)
- When building takes damage: spawn 8 small box "rubble" meshes that fall with gravity (reuse explosion particle approach)
- Half-destroyed buildings: render with reduced height AND add jagged top via random vertex displacement on the Y-cap
- Destroyed buildings: leave rubble pile (flat dark mesh at ground level) + small fire particle for 3s
- Add building fire: pointLight at damaged building positions, flickering orange
- Use separate InstancedMesh for rubble piles at destroyed building sites

### 5. Fix Station Cluster (`constants.ts`)
- Spread Maidan/Khreshchatyk/Teatralna/Palats Sportu further apart:
  - r10 Teatralna: `(0.42, 0.44)` (was 0.43, 0.43)
  - r11 Khreshchatyk: `(0.50, 0.40)` (was 0.49, 0.41)
  - b8 Maidan: `(0.46, 0.46)` (was 0.47, 0.44)
  - g5 Palats Sportu: `(0.38, 0.42)` (was 0.39, 0.41)

### 6. Night Lighting Fix (`Scene3D.tsx`, `CityBuildings.tsx`)
- Add 6 area pointLights distributed across the map at night (city glow) with warm orange color
- Buildings: increase emissive intensity at night from 0.15 to 0.5
- Window glow layer: increase opacity from 0.4 to 0.7 at night
- Station emissive at night: increase from 0.6 to 1.0
- Ground material at night: add slight emissive (`#0a0e20`, 0.1) so it's not pure black

### 7. Better Drone Visuals (`DroneModel.tsx`)
- Shahed: Add animated rear propeller (rotating cylinder), warhead glow (pulsing red sphere at nose), smoke trail (line of fading spheres with slight Y randomness)
- Molniya: Add wing tip lights (tiny green/red spheres), faster wobble animation
- Gerbera: Add twin rotating propellers under engine pods, payload bay door (dark underside panel), heavier smoke trail
- All drones: Better hit feedback — on damage, briefly scale up 1.2x and flash white for 100ms
- Improve engine trail: use more particles (6 instead of 3), vary Y position slightly for organic feel

### 8. Reorganized Action Bar (`ActionBar.tsx`)
- Replace flat row with **categorized sections** separated by subtle dividers and labels:
  - **Транспорт**: Buy train (3 line buttons), upgrade train
  - **Оборона**: AA, Shield, Decoy, Radar, Drone Jammer, Signal Flare
  - **Економіка**: Double Fare, Emergency Fund, Passenger Airdrop
  - **Екстрені**: Emergency Brake, Blackout, Speed Boost, Express Line, Reinforcements
- Each section has a tiny label above it
- Active cooldowns show remaining seconds as small overlay text
- Buttons slightly larger with better padding

### 9. Performance Fixes (`Scene3D.tsx`)
- SignalFlareLines: don't create new THREE.Line/BufferGeometry every render — pre-allocate line pool and update positions
- CloudLayer: use InstancedMesh instead of individual meshes
- Remove AmbientParticles Y-position mutation every frame (causes needsUpdate thrashing) — use shader offset instead via uniform
- Throttle DynamicEntities state comparison to every 5 frames instead of every frame

### 10. Fix Console Errors (`GameCanvas.tsx`)
- TopBar and ActionBar are wrapped in React.memo but GameCanvas tries to pass refs — remove ref forwarding attempt or add forwardRef

### 11. Add New Gameplay Features
- **InterceptorDrone**: friendly drone entity that chases enemy drones (new entity type)
- **SAM Battery**: upgradeable AA with visual tracers
- **Auto-repair**: stations slowly regenerate 1 HP/5s when not under attack
- **Population growth**: passenger spawn rate slowly increases with delivered passengers (positive feedback)
- **Weather effects**: occasional rain (particle system) that slows drones by 20%
- **Station income display**: show running total of money earned per station in StationPanel

### 12. Types Update (`types.ts`)
- Add `cameraMode` to Camera
- Add `interceptorDrones: InterceptorDrone[]` to GameState
- Add `samBatteries` tracking to station
- Add `tracerLines: TracerLine[]` for visual AA feedback
- Add `weatherTimer`, `isRaining` to GameState

## File Summary

| File | Changes |
|------|---------|
| `constants.ts` | Fix station cluster coords |
| `types.ts` | Add cameraMode, interceptorDrones, tracerLines, weather |
| `GameEngine.ts` | SAM battery logic, interceptor drones, auto-repair, weather, population growth |
| `Scene3D.tsx` | Camera modes, night lighting, tracer lines, remove AmbientParticles thrash, fix SignalFlareLines perf |
| `CityBuildings.tsx` | Rubble meshes, building fire, enhanced night emissive |
| `DroneModel.tsx` | Animated propellers, better trails, hit flash improvements |
| `GameCanvas.tsx` | Remove Minimap, add camera mode UI, fix ref warnings, camera shortcuts |
| `ActionBar.tsx` | Categorized sections with labels, cooldown overlays |
| `StationPanel.tsx` | Station income display, SAM battery button |
| `TopBar.tsx` | Weather indicator, camera mode display |
| `Minimap.tsx` | DELETE this file |

~11 files modified, 1 deleted, 0 new files.

