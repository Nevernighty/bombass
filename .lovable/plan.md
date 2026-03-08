

# Phase 3: Fix Train Rotation, Clean Up Visuals, Add Gameplay Depth

## Issues from Screenshot

1. **Trains face sideways** — the procedural train body extends along local X (`boxGeometry [3.2, 0.9, 1.1]`), but `atan2(dx, dz)` gives 0 when traveling north/south. Need `-Math.PI/2` rotation offset so the long axis aligns with travel direction.
2. **Passenger orbits overlap station names** — orbiting spheres at radius 1.9 collide with text at Y=2.7. Too cluttered with name + count + HP bar all stacked.
3. **Buildings not initializing** — the second `useMemo` in `CityBuildings.tsx` runs before the ref is set. Needs `useEffect`.
4. **Gameplay too shallow** — no transfer routing, no click-to-target drones, QTE too simple, no wave feedback.

## Changes

### 1. Fix Train Rotation (`TrainModel.tsx`)
- Add `- Math.PI / 2` to the computed `atan2` angle so the train's long axis (local X) aligns with the travel direction
- Increase rotation lerp from `0.15` to `0.25` for snappier turns

### 2. Clean Station Visuals (`StationNode3D.tsx`)
- Remove `PassengerIndicators` component entirely (orbiting spheres are cluttered)
- Replace with a simple passenger count badge: small colored bar under station name showing fill ratio
- Move station name higher (`size + 1.8`) to avoid overlap with station mesh
- Remove the separate HP bar Billboard — consolidate into station material color (red tint when damaged)
- Show passenger count only when >0, as compact `3/8` text

### 3. Fix CityBuildings (`CityBuildings.tsx`)
- Replace second `useMemo` with `useEffect` so ref is available
- Add emissive window dots: set `emissive` on material and vary per-instance

### 4. Click-to-Target Drone Defense (`DroneModel.tsx`, `GameCanvas.tsx`, `GameEngine.ts`)
- Make drones clickable — clicking a drone during air raid deals 1 damage (costs 5 money)
- Add `onDroneClick` handler in GameCanvas that calls new `attackDrone()` engine function
- Visual feedback: drone flashes white on hit
- Remove type label Billboard from drones (visual noise) — keep only HP for multi-HP drones

### 5. Passenger Transfer Logic (`GameEngine.ts`)
- When a train arrives at a transfer station, passengers whose destination shape exists on the OTHER line get offloaded to the station's passenger queue
- This enables multi-line journeys: passenger spawns on red, transfers at Teatralna to blue
- Simple: just unload passengers whose shape matches no station on current line but exists on another active line

### 6. Wave Feedback & Better QTE (`GameCanvas.tsx`)
- Show wave number in TopBar
- QTE: show target drone highlighted with pulsing ring in 3D scene (not just key prompt)
- Add countdown timer bar that's more visible

### 7. Drone Click Handler Wiring
- `DroneModel` gets `onClick` prop
- `DynamicEntities` passes click handler
- `GameEngine.ts` gets `attackDrone(state, droneId)` function

## File Changes

| File | Changes |
|------|---------|
| `TrainModel.tsx` | Add `- Math.PI / 2` to rotation angle |
| `StationNode3D.tsx` | Remove PassengerIndicators, simplify labels |
| `CityBuildings.tsx` | Fix `useMemo` → `useEffect` for instance init |
| `DroneModel.tsx` | Add onClick, remove type label, add hit flash |
| `GameEngine.ts` | Add `attackDrone()`, add transfer logic in train arrival |
| `GameCanvas.tsx` | Wire drone click, show wave in TopBar |
| `TopBar.tsx` | Add waveIndex prop and display |
| `Scene3D.tsx` | Pass onDroneClick through DynamicEntities |

~8 files, no new files, no architecture changes.

