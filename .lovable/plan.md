

# Fix Plan: Metro Lines, Train Animation, Drone Models, and Core Polish

## Problems Identified

1. **Metro lines invisible** — `MetroLine3D` creates a dummy 1-unit geometry on mount, then only rebuilds when `prevStationCount` changes. On first render, the count starts at 0, so it should rebuild — but the initial `activeStationIds` has 6 stations (2 per line), so lines should appear. The likely issue: the `useFrame` rebuilds geometry but the initial dummy tube is visible as a tiny segment at origin. Need to verify the rebuild triggers correctly.

2. **Trains look ugly/wrong rotation** — `TrainModel` uses `TrainFallback` (primitive boxes) inside a `<Suspense>` but never actually renders the GLB (`TrainGLB` is defined but not used in the JSX). Trains also jump/teleport because route index changes abruptly when `progress >= 1`.

3. **Drones use primitive geometry** — `DroneModel` uses hand-built `DroneMesh` with cylinders/boxes instead of loading the GLB models (`shahed_136.glb`, `molniya_uav.glb`, `uav_gerbera_low-poly.glb`).

4. **Passive event listener error** — `onWheel` with `e.preventDefault()` on a React div is passive by default. Need to use a `useEffect` with `{ passive: false }`.

5. **No passenger load/unload animation** — passengers just appear/disappear from arrays with no visual feedback.

6. **Poor SFX** — air raid siren is a basic sawtooth oscillator, needs more realistic modulation.

## Implementation Steps

### 1. Fix Metro Lines Rendering
- In `MetroLine3D.tsx`: initialize `prevStationCount` to `-1` so the geometry always rebuilds on first frame.
- Increase tube radius slightly for visibility.
- Add a pulsing animation along the line.

### 2. Fix Train Models — Use GLB + Smooth Movement
- In `TrainModel.tsx`: replace `<TrainFallback>` in JSX with `<TrainGLB>` inside `<Suspense fallback={<TrainFallback>}>`.
- Fix train rotation: compute facing angle from current position to next station using `Math.atan2` and smoothly interpolate (`lerp`) the rotation each frame.
- Ensure trains never teleport — keep position interpolation continuous.

### 3. Load Drone GLB Models
- In `DroneModel.tsx`: replace primitive `DroneMesh` with GLB-loaded models:
  - `shahed` → `/models/shahed_136.glb`
  - `molniya` → `/models/molniya_uav.glb`  
  - `gerbera` → `/models/uav_gerbera_low-poly.glb`
- Use `useGLTF` + `Suspense` with current primitive as fallback.
- Scale drones larger (current ones are tiny at the 100x80 world scale).
- Fix orientation: face toward target station using `Math.atan2`.

### 4. Fix Passive Event Listener
- In `GameCanvas.tsx`: remove `onWheel` from the div JSX.
- Add a `useEffect` that attaches wheel listener with `{ passive: false }` to the container div via ref.

### 5. Improve Air Raid Siren
- In `AudioEngine.ts`: make the siren use two oscillators with frequency modulation for a more realistic warbling effect. Add a low-frequency rumble layer.

### 6. Better Visual Feedback
- In `StationNode3D.tsx`: add a scale-up animation when passengers spawn (brief pulse).
- In `TrainModel.tsx`: add a dwell animation (doors opening = side meshes scale out, passenger count text updates).
- Increase station shape sizes for better visibility.

### 7. Scene Camera Centering
- In `Scene3D.tsx` `CameraController`: ensure initial camera position centers on the starting 6 stations (around x=0.44, y=0.42 in normalized coords, which maps to roughly x=-6, z=-6.4 in world space). Set initial `camera.targetX` and `targetY` to center the view.

### Files to Modify
- `src/game/components/MetroLine3D.tsx` — fix initial geometry rebuild
- `src/game/components/TrainModel.tsx` — use GLB model, fix rotation
- `src/game/components/DroneModel.tsx` — use GLB models, fix scale/orientation  
- `src/game/GameCanvas.tsx` — fix passive wheel listener
- `src/game/AudioEngine.ts` — better siren sound
- `src/game/Scene3D.tsx` — camera centering
- `src/game/components/StationNode3D.tsx` — larger shapes, spawn animation

