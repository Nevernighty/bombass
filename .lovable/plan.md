

# Phase 16: Complete Visual Overhaul — Buildings, River, Animations, Destruction

## Problems from Screenshots

1. **Metro lines too thick** — TUBE_RADIUS=0.18 + GLOW_RADIUS=0.35 still creates fat tubes that obscure station shapes
2. **Buildings are 120 random tiny boxes** scattered everywhere with no relation to stations or districts — looks like random noise
3. **River tube geometry overlaps stations** — TubeGeometry radius=4 creates a 3D tube that clips through station nodes near x=0.55-0.60
4. **No passenger animations** — passengers are just orbiting dots, no walking/boarding visuals
5. **Trains "jump"** — lerp factor `delta * 10` causes snapping when delta spikes; no smooth easing
6. **Drones primarily target stations, only 30% chance to redirect to buildings** — should be buildings-first with visible strike effects
7. **Buildings not selectable or meaningful** — just instanced boxes with no interaction

## Plan — 7 files

### 1. CityBuildings.tsx — Complete Rewrite
- Reduce from 120 → **40 buildings**, placed in **clusters around stations** (3-5 buildings per station area, 4-10 units away)
- Each building has a **district name** based on nearest station
- **3 building types**: tall tower (h=6-10, w=2-3), apartment block (h=3-5, w=3-5), low commercial (h=1-2, w=2-4)
- Buildings are **clickable** — show name + HP in a tooltip
- When destroyed: spawn **debris particles** (8-12 small boxes flying outward with gravity, fading over 2s)
- When damaged: building geometry **shrinks vertically** + turns darker + adds **smoke particles** (3 rising spheres)
- Remove streetlights (visual noise)
- Add **window rows** on each building face (multiple planes at different heights)

### 2. RiverPlane.tsx — Flat Ribbon, Not Tube
- Replace TubeGeometry with a **flat Shape extruded along path** using custom geometry
- Build a flat ribbon: for each curve point, create left/right vertices offset perpendicular to curve tangent
- River width = 6 units, positioned at y=-0.05 (below ground plane)
- Remove bank geometry (was another tube)
- Adjust DNIPRO_RIVER_POINTS to ensure river **doesn't cross any station positions** — shift river x-coords slightly east where it conflicts with stations near x=0.58-0.60

### 3. MetroLine3D.tsx — Thinner Lines
- Reduce TUBE_RADIUS from 0.18 → **0.08** (hairline)
- Reduce GLOW_RADIUS from 0.35 → **0.15**
- Add **animated energy pulse**: a small bright sphere that travels along the curve (one per line), looping every 3s
- Lower emissiveIntensity to 0.4 day / 0.7 night

### 4. TrainModel.tsx — Smooth Movement + Passenger Boarding
- Replace `delta * 10` lerp with **critically damped spring** (smoother, no jumping): `smoothPos.current.lerp(targetPos, 1 - Math.exp(-8 * delta))`
- Add **passenger boarding animation**: when train is dwelling, show small colored dots moving from station toward train (3 dots max, tween from station pos to train pos over 0.5s)
- Remove the capacity bar box (ugly), replace with **colored ring** under train that changes color based on fill
- Scale down ground shadow and glow ring slightly

### 5. GameEngine.ts — Drones Target Buildings First
- Change drone targeting: **70% chance** to target nearest building, 30% station (flip from current)
- When drone targets a building, set `targetBuildingIdx` at spawn time, not at hit time
- Drone flies to building position, not station, when targeting building
- On building hit: create larger explosion (maxRadius: 50), add screen shake 8

### 6. constants.ts — Adjust River to Avoid Station Overlap
- Shift DNIPRO_RIVER_POINTS slightly east (x += 0.03) for points between y=0.30 and y=0.55 to avoid overlapping the central station cluster
- This ensures the river visually passes between Arsenalna (x=0.58) and Khreshchatyk (x=0.52) without touching either

### 7. ExplosionEffect.tsx — Building Debris Particles
- When explosion is near a building (check proximity in useFrame), spawn additional **debris meshes**: small dark boxes that fly outward with parabolic trajectories
- Add persistent **smoke column** for destroyed buildings: dark sphere rising slowly at destroyed building locations

## File Summary

| File | Key Change |
|------|-----------|
| `CityBuildings.tsx` | 40 buildings in station clusters, clickable, debris on destroy, smoke on damage |
| `RiverPlane.tsx` | Flat ribbon geometry, y=-0.05, no tube |
| `MetroLine3D.tsx` | Radius 0.08, energy pulse sphere |
| `TrainModel.tsx` | Spring-damped movement, boarding dots animation |
| `GameEngine.ts` | 70% building targeting for drones |
| `constants.ts` | Shift river points to avoid stations |
| `ExplosionEffect.tsx` | Debris particles for building hits |

