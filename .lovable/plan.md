

# Phase 9: Critical Fix + Grand Visual & Gameplay Overhaul

## Critical Bug: 3D Scene Crashes on Mount

The console shows `SceneContent` in `Scene3D.tsx` is throwing errors that crash the entire R3F Canvas. The `<bufferAttribute>` JSX elements in `NightSky`, `AmbientParticles`, and `RainEffect` are likely causing this — R3F v8 has known issues with declarative `bufferAttribute`. The game renders ONLY the start screen overlay on a black canvas because the 3D scene never mounts successfully.

**Fix**: Replace all `<bufferAttribute>` JSX with imperative geometry setup using `useEffect` + `ref.current.geometry.setAttribute(...)`.

## Plan (~12 files)

### 1. Fix Scene Crash (`Scene3D.tsx`) — CRITICAL
- Replace `<bufferAttribute attach="attributes-position" args={[positions, 3]} />` pattern in `NightSky`, `AmbientParticles`, `RainEffect` with imperative refs
- Use `useEffect` to set geometry attributes: `ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))`
- This alone should make the game playable

### 2. Camera: Better Default & Smoother Controls (`Scene3D.tsx`)
- Default tilt from 0.65 → 0.55 (less steep, more natural overview)
- Pan speed increase: 25 → 40 for WASD responsiveness
- Zoom range: min 0.3, max 4 (current 0.2-5 is too extreme)
- Smooth lerp factor: 0.1 → 0.12 for snappier response
- Follow mode: zoom to 1.5 for closer train view
- Auto-center on drone impact: add `autoPanTarget` that briefly pulls camera toward explosions (1s, interruptible by user input)

### 3. Start Screen Redesign (`GameCanvas.tsx`)
- Add animated 3D background: render the 3D scene behind the start screen overlay (scene already renders, just lower overlay opacity to 0.85 so city shows through)
- Mode cards: larger padding (p-4), clearer hover with scale(1.03) + lift shadow
- Add "WASD рух | ЛКМ станція | ПКМ обертання | Колесо зум" as persistent footer
- Difficulty stars: replace `⭐☆` with colored progress bar (gold fill)
- Add subtle particle animation in background (CSS-only floating dots)

### 4. Improved Game HUD Layout (`TopBar.tsx`)
- Merge left and right panels into a single top bar spanning full width
- Left section: Score + Combo + Money + Lives (primary stats)
- Center section: Wave indicator + Air Raid status + Speed controls
- Right section: Time + Passengers + Drones + Power + Satisfaction
- Reduce font sizes slightly for cleaner look
- Add subtle gradient background instead of flat rgba

### 5. Better 3D Visuals

**Metro Lines (`MetroLine3D.tsx`)**:
- Increase tube radius from 0.3 → 0.5 for better visibility
- Glow tube from 0.7 → 1.0
- Add animated energy pulse: a small bright sphere that travels along the line path (one per line, loops)

**Buildings (`CityBuildings.tsx`)**:
- Add more height variety: some tall towers h=2-8, some low h=0.5-1.5 (current 0.3-5.3)
- Add rooftop details: small box on top of 30% of buildings (antenna/AC unit)
- 4 distinct building color palettes based on position quadrant
- Window grid pattern: instead of single plane, use 3-4 smaller window planes at different heights

**Ground (`Scene3D.tsx`)**:
- Replace flat gray ground with subtle grid + color zones (darker near water, lighter inland)
- Add a subtle terrain texture feel with a second mesh at slight offset

### 6. Station Visuals Upgrade (`StationNode3D.tsx`)
- Increase base platform size from 1.5 → 2.0 for better visibility and clickability
- Add passenger orbit dots: 3D spheres orbiting station at passenger count (max 6 shown)
- Platform ring emissive glow: pulse brightness based on passenger fill ratio
- Station label: increase font size from 0.42 → 0.55 for readability
- On fire: add actual fire particle system (6 small orange spheres bobbing upward)

### 7. Train Visuals Upgrade (`TrainModel.tsx`)
- Scale train model 1.3x for better visibility
- Add running lights: 2 small spheres on sides that pulse
- Dwell animation: train bobs slightly up and down, doors flash (side planes briefly appear)
- Capacity visual: colored band under train (green → yellow → red gradient based on fill)

### 8. Drone Visuals Upgrade (`DroneModel.tsx`)
- All drones: add danger radius circle on ground below (red transparent ring projected down)
- Shahed: increase smoke trail density (8 particles instead of 6), add engine sound indicator (pulsing rear glow)
- On damage: fragments fly off (3 small boxes scatter outward for 0.5s)
- Stunned effect: drone flickers rapidly (visible toggle every 100ms)

### 9. Action Bar Improvements (`ActionBar.tsx`)
- Make buttons slightly larger: min-width 42px, py-2
- Add text labels below each emoji (3-4 char abbreviations): ПРО, ЩИТ, РДР, etc.
- Section labels: slightly bigger and more visible (opacity 0.35 → 0.5)
- Add cost text directly on button face in small font
- Insufficient money: entire button has red tint, not just text

### 10. Station Panel Polish (`StationPanel.tsx`)
- Panel width: max-w-xs → max-w-sm for more breathing room
- Group defense buttons into 2 rows max with clear visual separation
- Add mini station preview: colored circle with shape icon at top of panel
- HP bar: taller (h-3), with gradient fill and numeric value overlay
- Close button: larger hit area, "X" icon instead of text

### 11. New Gameplay: Objectives & Missions System (`GameEngine.ts`, `types.ts`)
- Add `currentMission` to GameState with rotating mini-objectives:
  - "Deliver 10 passengers in 30 seconds" → bonus 50 money
  - "Intercept 3 drones without losing a station" → bonus 30 money  
  - "Fill a train to capacity" → bonus 20 money
- Mission rotates every 45 seconds, shows in TopBar center
- Completing mission: green flash + money reward + floating score
- Adds constant micro-goals for player engagement

### 12. Sound & Visual Event Polish (`GameCanvas.tsx`)
- Air raid warning: pulsing red border becomes thicker and includes directional arrows showing where drones come from
- Passenger delivery milestone (every 25): brief golden screen flash + "25 ПАСАЖИРІВ!" text
- Station destroyed: camera briefly shakes + zooms in slightly toward destroyed station
- Floating scores: position relative to world coordinates (project 3D → 2D screen coords) instead of fixed percentages

## File Summary

| File | Changes |
|------|---------|
| `Scene3D.tsx` | Fix bufferAttribute crash, camera improvements, ground upgrade, night lighting |
| `GameCanvas.tsx` | Start screen redesign, floating score projection, air raid direction, milestone events |
| `TopBar.tsx` | Unified top bar layout, mission display |
| `ActionBar.tsx` | Larger buttons, text labels, cost display, red tint for insufficient |
| `StationPanel.tsx` | Wider panel, grouped buttons, station preview, better HP bar |
| `StationNode3D.tsx` | Larger platforms, passenger orbit, fire particles, bigger labels |
| `TrainModel.tsx` | 1.3x scale, running lights, dwell animation, capacity band |
| `DroneModel.tsx` | Ground danger ring, damage fragments, stunned flicker |
| `MetroLine3D.tsx` | Thicker tubes, energy pulse animation |
| `CityBuildings.tsx` | Height variety, rooftop details, window grid |
| `GameEngine.ts` | Mission system, milestone events |
| `types.ts` | Mission interface, new state fields |

~12 files. Priority: fix crash first, then visuals, then gameplay.

