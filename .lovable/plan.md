

# Kyiv Transit: Resilience — 2.5D Upgrade Plan

## Current State
The game runs on a **2D HTML5 Canvas** with basic geometric shapes, procedural audio, and simple sprite rendering. Trains disappear abruptly at route ends, the Shahed drone PNG is oriented incorrectly, and there's no 3D rendering.

## Architecture Change: Canvas 2D → React Three Fiber (Three.js)

The entire rendering pipeline will be replaced with **@react-three/fiber** + **@react-three/drei** for a 2.5D isometric view using the uploaded GLB models.

### New Dependencies
- `@react-three/fiber@^8.18` + `three@^0.160` + `@react-three/drei@^9.122.0`

### GLB Models to Integrate
| Model | File | Usage |
|-------|------|-------|
| Metro wagon | `metro_wagon_type_d.glb` | Primary train model |
| Metro 2033 train | `metro_2033_train.glb` | Alternate/upgraded train |
| Shahed drone | `shahed_136.glb` | Main attack drone |
| Molniya UAV | `molniya_uav.glb` | Fast reconnaissance drone |
| Gerbera UAV | `uav_gerbera_low-poly.glb` | Heavy bomber drone |
| Low-poly man | `low-poly_man.glb` | Male passenger |
| Low-poly woman | `low-poly_woman.glb` | Female passenger |
| South Bridge | `south_bridge_kyiv.glb` | Bridge over Dnipro |

### Implementation Steps

**1. Copy all GLB assets to `public/models/`**
All 8 GLB files copied for Three.js loader access.

**2. Create 3D Scene (`src/game/Scene3D.tsx`)**
- Orthographic camera at 45° isometric angle (2.5D)
- Flat plane for map with Kyiv texture/grid
- Ambient + directional light with day/night color transitions
- Post-processing: bloom for neon lines at night, chromatic aberration during raids

**3. Create 3D Components**
- **`TrainModel.tsx`** — loads `metro_wagon_type_d.glb`, interpolates position along line path with quaternion rotation to follow curves smoothly. On dwell: door-open animation (scale sides). No abrupt disappearing — trains always exist and move.
- **`DroneModel.tsx`** — loads one of 3 drone GLBs based on type. Correct orientation via rotation offset. Wing wobble via sine on rotation.z. On destruction: model breaks apart (explode geometry into fragments with physics impulse).
- **`PassengerModel.tsx`** — tiny low-poly figures at stations, animated spawn (scale from 0), boarding animation (walk toward train).
- **`StationNode.tsx`** — 3D geometric shapes (sphere, cube, tetrahedron, octahedron, icosahedron) with outline/glow shader. Jelly wobble via spring-animated scale.
- **`MetroLine3D.tsx`** — TubeGeometry along station points with emissive material that glows at night.
- **`BridgeModel.tsx`** — loads `south_bridge_kyiv.glb` positioned over the Dnipro crossing.
- **`RiverPlane.tsx`** — animated water shader (simple vertex displacement + blue gradient).

**4. Multiple Drone Types & Defense Systems**
- **Shahed-136**: Slow, heavy damage, intercepted via QTE (Q/W/E/R)
- **Molniya**: Fast, low damage, requires rapid double-tap defense
- **Gerbera**: Heavy bomber, needs 3 hits (click-to-target with cooldown)
- Each drone type has distinct visual, speed, HP, and damage values
- Update `types.ts` with `droneType: 'shahed' | 'molniya' | 'gerbera'` and `droneHp`

**5. Train Fixes**
- Trains follow the line path via spline interpolation (CatmullRom) — no teleporting
- `lookAt` next point on spline for smooth turning along curves
- Dwell animation: flash/pulse, passenger count floats above
- Trains never removed from scene; they bounce between endpoints

**6. Speed Control UI**
- Toolbar with 1x / 2x / 5x / 10x speed buttons
- Multiplies `dt` before passing to `updateGame()`
- Visual indicator showing current speed

**7. Advanced UI Additions**
- Glassmorphism control panel (bottom): speed control, train purchase, route toggle
- Minimap (corner): shows full network overview
- Floating damage numbers when passengers delivered or drones hit
- Station detail popup on hover: 3D passenger queue visualization

**8. 10 New Gameplay Functions**
1. **`purchaseTrain(line)`** — buy additional trains with score points
2. **`toggleStationOpen(id)`** — manually close/open stations
3. **`upgradeTrainCapacity(trainId)`** — increase capacity from 6→8→12
4. **`deployAntiAir(stationId)`** — place auto-defense on a station
5. **`activateShield(stationId)`** — temporary invulnerability (cooldown)
6. **`fastForward(multiplier)`** — speed control
7. **`rerouteTrain(trainId, newLine)`** — move train to different line
8. **`evacuateStation(id)`** — emergency passenger dispersal
9. **`callReinforcements()`** — spawn extra DSNS units
10. **`upgradeStation(id)`** — increase max HP and passenger capacity

**9. VFX/SFX Enhancements**
- **Particle system**: sparks on train arrival, smoke on fire, confetti on milestone
- **Destruction VFX**: drone models break into mesh fragments on death (geometry explosion)
- **Screen effects**: vignette during raids, bloom on neon lines, motion blur on fast-forward
- **Audio**: distinct sounds per drone type, train arrival chime varies by line, ambient city noise layer

**10. Renderer Refactor**
- `GameCanvas.tsx` becomes a thin wrapper around R3F `<Canvas>`
- Game logic (`GameEngine.ts`) stays pure — no rendering code
- `Renderer.ts` is **deleted** (replaced by R3F components)
- Game loop drives state; R3F reads state via refs for 60fps rendering

### File Structure (New/Modified)
```
public/models/          — All 8 GLB files
src/game/
  Scene3D.tsx           — Main R3F scene (camera, lights, post-processing)
  components/
    TrainModel.tsx       — 3D train with spline following
    DroneModel.tsx       — 3D drone with type variants
    PassengerModel.tsx   — Tiny people at stations
    StationNode.tsx      — 3D geometric station shapes
    MetroLine3D.tsx      — Tube geometry lines
    BridgeModel.tsx      — Dnipro bridge model
    RiverPlane.tsx       — Animated water
    Particles.tsx        — Spark/smoke/explosion particles
    FloatingText.tsx     — Damage numbers, notifications
  GameCanvas.tsx         — Updated: R3F Canvas + HUD overlay
  GameEngine.ts          — Updated: drone types, new functions, speed mult
  types.ts               — Updated: new fields
  constants.ts           — Updated: drone type configs
  AudioEngine.ts         — Updated: per-type sounds
  HUD/
    SpeedControl.tsx
    Minimap.tsx
    ActionBar.tsx
  Renderer.ts            — DELETED
```

### Risk: GLB Model Compatibility
Some GLB files may have incorrect scale, rotation, or broken meshes. The plan includes a testing phase where each model is loaded in isolation to verify it renders, then adjusted with rotation/scale offsets before integration.

### Performance Considerations
- Use `useGLTF.preload()` for all models at app start
- Instance meshes for passengers (many identical models)
- Limit particle count with pool recycling
- LOD for distant stations (simplified geometry)

