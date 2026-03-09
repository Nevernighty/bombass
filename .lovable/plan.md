

# Fix: Black Screen, UI Overlaps & Performance

## Root Cause Analysis

### Black Screen
The Canvas renders with `style={{ background: '#060a14' }}` and the start screen overlays it with `background: 'hsla(var(--game-bg), 0.98)'`. Looking at the screenshot, the game appears to have started (no start screen visible) but shows black — likely the WebGL context crashed or a Three.js error occurred silently.

Key suspects:
1. **InterceptorDronesLayer** creates 10 groups each with a `pointLight` — that's 10 extra point lights in the scene on top of the existing 3-5. WebGL has limits on simultaneous lights.
2. **`primitive object={new THREE.Line(...)}`** in DrawingLine (line 653) creates a **new THREE.Line on every render** — this leaks GPU resources and can crash WebGL.
3. The `useThree` import on line 2 of Scene3D includes only needed hooks, but `DrawingLine` also calls `useThree()` which is fine. However the `new THREE.Line(lineGeo, lineMat)` inside JSX is the critical issue — it instantiates geometry every render cycle.

### UI Overlaps
- Air raid banner: `absolute top-14` (line 702)
- Active events: `absolute top-14` (line 635)  
- Rush hour: `absolute top-14 right-4` (line 709)
- Drawing mode: `absolute top-24` (line 717)
- Pending stations: `absolute top-24 right-4` (line 725)

All these stack on top of each other with no z-index management or stacking logic.

### Performance
- 10 point lights from InterceptorDronesLayer
- Moon has its own pointLight
- Air raid has pulsing pointLight
- Night has 2 more pointLights
- Total possible: ~16 point lights simultaneously

## Plan — 3 files

### 1. `Scene3D.tsx` — Fix WebGL crash & reduce lights

**DrawingLine fix**: The `<primitive object={new THREE.Line(lineGeo, lineMat)} />` creates a new Line object every render. Memoize it with `useMemo`.

**InterceptorDronesLayer**: Remove `<pointLight>` from each of the 10 interceptor groups. Use emissive material only — that's 10 fewer lights.

**NightSky moon light**: Remove the moon pointLight (distance 200 is huge). Moon is already a bright `meshBasicMaterial`.

**Total light reduction**: From ~16 possible to 4-5 max.

### 2. `GameCanvas.tsx` — Fix UI overlaps with proper stacking

Replace the chaotic absolute positioning with a single notification stack container at top-center:
- Merge air raid banner, rush hour, active events, drawing mode indicator, and pending stations indicator into one vertically stacked container below the TopBar
- Use `flex flex-col gap-1` with proper z-index ordering
- Air raid gets highest visual priority (top), then active events, then drawing/pending indicators
- Each banner gets a unique z-index and won't overlap

### 3. `Scene3D.tsx` — Performance: reduce particle counts

- Reduce rain particles from 150 to 80
- Reduce star count from 200 to 100
- Reduce ambient particles from 40 to 20

## File Summary

| File | Change |
|------|--------|
| `Scene3D.tsx` | Fix `new THREE.Line` leak in DrawingLine, remove 10+ pointLights from interceptors/moon, reduce particle counts |
| `GameCanvas.tsx` | Stack all notification banners in single flex-col container below TopBar, eliminate overlaps |

