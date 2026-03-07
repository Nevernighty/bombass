

# Fix Plan: Train Movement, Metro Lines, Camera, and Visual Polish

## Critical Bugs

### 1. Train Teleportation
**Root cause in `GameEngine.ts` lines 181-243**: When `progress >= 1`, the train enters dwell mode, but `routeIndex` only advances AFTER dwell ends (line 194). During dwell, position snaps to `curStation` (line 198). The problem: when dwell ends, `routeIndex` advances but `progress` resets to 0, causing an instant position jump to the NEW station. The easing interpolation (line 238) then interpolates FROM the new station TO the next — meaning the train visually teleports to the station it should have just arrived at.

**Fix**: When `progress >= 1`, advance `routeIndex` immediately (before dwell), so the train dwells at the CORRECT destination station. Then on dwell end, keep routeIndex the same and just resume movement toward the next station.

### 2. Train Rotation
**Root cause in `TrainModel.tsx`**: Rotation is computed from `route[curIdx]` to `route[nextIdx]` using the game engine's routeIndex, but during dwell the train has already advanced its routeIndex, so the "next" station direction flips. Also `prevAngle.current` smoothing factor of `0.08` is too slow — trains lag behind their actual heading.

**Fix**: Store the last valid movement direction and keep it during dwell. Increase rotation lerp to `0.15`.

### 3. Metro Lines Not Rendering
**Root cause in `MetroLine3D.tsx`**: The `prevKey` starts as `''` and compares against `activeIds.join(',')`. This works on paper, but the `useFrame` runs BEFORE `GameLoop` updates state on the first few frames, so `getActiveLineStations` may return stale data. Also the tube radius of `0.35` is barely visible at the default zoom.

**Fix**: Initialize `prevKey` to a sentinel like `'__init__'` that never matches. Increase tube radius to `0.5` for main line and `0.9` for glow.

### 4. Camera System
**Root cause**: `ortho.position.set(baseX - cam.x * 0.5, ...)` — the pan scaling factor `0.5` doesn't match the mouse delta scaling `0.3` in GameCanvas, making panning feel disconnected. Also `baseX=35, baseZ=35` positions the camera far from the center of the map.

**Fix**: Change camera base position to `(30, 50, 30)` and adjust pan factors so 1 pixel of mouse drag = ~0.15 world units.

## Implementation

### Files to modify:

**`src/game/GameEngine.ts`** — Fix train movement logic:
- On `progress >= 1`: immediately set `routeIndex = nextIdx`, set `progress = 0`, enter dwell
- During dwell: position stays at `route[routeIndex]` (already correct station)
- On dwell end: just check bounds for direction reversal, DON'T advance routeIndex again
- Add building generation data to state (array of simple building positions)

**`src/game/components/TrainModel.tsx`** — Fix rotation:
- Store `lastMovementAngle` ref separately from dwell state
- Only update angle when train is actually moving (not dwelling)
- Increase lerp factor to `0.15`
- Add subtle Y-bobbing during dwell (train "breathing")

**`src/game/components/MetroLine3D.tsx`** — Fix rendering:
- Initialize `prevKey` to `'__init__'`
- Increase tube radius: main `0.5`, glow `1.0`
- Add animated dash pattern using custom shader material (scrolling UV offset)

**`src/game/Scene3D.tsx`** — Camera and buildings:
- Adjust camera base position to `(30, 50, 30)`
- Add procedural building boxes scattered around the map (50-80 simple boxes with random heights 1-5, muted dark colors)
- Add fog for atmosphere: `<fog attach="fog" args={['#0a0e1a', 60, 120]} />`

**`src/game/GameCanvas.tsx`** — Camera panning:
- Reduce pan sensitivity: `dx * 0.15` instead of `0.3`
- Match camera pan factor in Scene3D to `1.0` instead of `0.5`

**`src/game/components/StationNode3D.tsx`** — Better visuals:
- Increase station size from `1.4` to `1.8`
- Add passenger count text billboard above station
- Use distinct passenger shape meshes (tiny cubes, pyramids etc.) instead of all spheres

**`src/game/components/DroneModel.tsx`** — Scale fix:
- Increase all drone scales by 1.5x
- Fix Shahed rotation: add `Math.PI` Y rotation offset so it faces forward

**`src/game/AudioEngine.ts`** — Better siren:
- Add second harmonic to siren (octave above)
- Add pulsing filter sweep on the siren for more menacing sound
- Add station arrival chime sound

**`src/game/components/ExplosionEffect.tsx`** — Better VFX:
- Add smoke particles that linger after explosion (dark spheres that rise and fade)
- Add debris particles (small boxes that fly outward with gravity)

This plan focuses on the critical movement/rendering bugs first, then visual polish. ~10 files modified.

