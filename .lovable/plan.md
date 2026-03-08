

# Phase 7: Gameplay Polish, Camera Fix, Visual Overhaul, New Features

## Problems from Screenshot

1. **Camera is ugly/awkward** — fixed isometric angle, orbit is janky. Need smoother camera with better default angle, smooth WASD controls, auto-follow nearest action
2. **Buildings are gray blobs** — no color variety, no windows visible, just gray rectangles scattered randomly
3. **Metro lines barely visible** — tubes are too thin, no glow visible in the screenshot
4. **Station cluster still overlaps** — central stations bunched up despite offsets
5. **No visual feedback for scoring** — score pops up as tiny notifications, no satisfying visual reward
6. **Action bar buttons are cryptic** — emoji-only buttons with no labels, hard to understand
7. **Game feels non-interactive** — too much watching, not enough doing. Need more moment-to-moment decisions

## Plan (~10 files, focused on playability)

### 1. Camera Overhaul (`Scene3D.tsx`)
- **Default angle**: Start at 35° tilt instead of 45° — more overview-friendly  
- **WASD panning**: Add keyboard pan (much faster than mouse drag)
- **Smooth zoom**: Logarithmic zoom curve, zoom toward mouse position
- **Auto-center on events**: Camera briefly pans to drone impacts, station explosions (with player override)
- **Better cinematic mode**: Figure-8 path instead of circular orbit
- **Overview mode**: Top-down at 75° angle, not just zoomed out

### 2. Scoring & Visual Feedback System (`GameCanvas.tsx`, `GameEngine.ts`)
- **Floating score numbers**: Large animated "+25" text that scales up, drifts upward, fades (CSS-based, not 3D for performance)
- **Combo streak bar**: Visual bar under TopBar that fills as combo increases, pulses golden at x3+
- **Kill cam flash**: Brief white border flash when drone is destroyed
- **Screen pulse**: Green border pulse on passenger delivery milestones (every 50)
- **Score multiplier popup**: "x2.0!" text when combo increases
- **Lives warning**: Screen edges flash red when down to 1 life

### 3. Better Station Visuals (`StationNode3D.tsx`)
- Larger platform rings with animated pulse when passengers waiting
- Passenger dots orbiting station (tiny colored spheres representing waiting passengers)
- Anti-air turret visible as rotating dish on station
- SAM battery visible as tall launcher
- Damaged stations: cracks (dark lines on surface), smoke particles
- Shelter mode: dome mesh over station

### 4. Improved Buildings (`CityBuildings.tsx`)
- **Color variety**: 4 building colors (dark blue, dark gray, dark brown, dark teal) distributed by position
- **Window rows that actually show**: Emissive yellow dots on building faces, more visible at night
- **Size variety**: More height variance, some tall towers (h=6-8), some low (h=1.5)
- **Destruction debris**: When destroyed, replace with rubble mesh (flat scattered boxes)

### 5. Better Train Visuals (`TrainModel.tsx`)
- **Interior glow**: Window meshes emit warm light at night
- **Passenger fill indicator**: Color-coded glow based on capacity (green=empty, yellow=half, red=full)
- **Speed lines**: When boosted, add trailing glow behind train

### 6. Enhanced Action Bar (`ActionBar.tsx`)
- **Text labels on buttons**: Short 2-3 letter abbreviations visible
- **Tooltip on hover**: Full description with cost and effect
- **Hotkey indicators**: Show keyboard shortcut on each button (Q,W,E,R,T etc.)
- **Category icons**: Better visual separators
- **Active effect glow**: Buttons glow when their effect is currently active

### 7. New Keyboard Shortcuts (`GameCanvas.tsx`)
- **WASD**: Camera pan
- **Q**: Quick buy train (cycles lines)
- **E**: Deploy nearest AA
- **R**: Reinforcements
- **T**: Place decoy
- **Tab**: Cycle through stations
- **N**: Next drone (cycle through active drones for selection)
- **G**: Toggle game speed cycle (1x→2x→5x→1x)

### 8. 10 New Gameplay Features (`GameEngine.ts`, `types.ts`)

**Feature 1: Chain Lightning** (50💰) — AA stations within range of each other chain damage to nearby drones. Visual: blue arc between AA stations.

**Feature 2: Evacuation Train** — Special non-line train that auto-routes to damaged stations, picks up all passengers, returns to safe station. Spawns automatically when station HP < 30%.

**Feature 3: Drone Swarm Warning** — 3 seconds before a large wave (>5 drones), screen edges pulse orange and a siren sound plays.

**Feature 4: Station Fortification** (100💰) — Doubles station HP permanently. Visual: concrete walls around station.

**Feature 5: Money Over Time** — Passive income: +1💰 per active station per 10 seconds. Rewards expanding the network.

**Feature 6: Critical Hit** — 10% chance AA deals double damage. Visual: "КРИТ!" notification in red.

**Feature 7: Drone EMP** (60💰) — Stuns all drones in a radius around clicked station for 3 seconds. Cooldown 45s.

**Feature 8: Train Shield** (30💰) — Selected train becomes immune to station fire damage for 15s, continues operating at burning stations.

**Feature 9: Population Panic** — When station is destroyed, nearby stations spawn 50% fewer passengers for 10s.

**Feature 10: Victory Lap** — After winning a mode, continue playing with 2x difficulty for bonus score.

### 9. Day/Night Visual Improvements (`Scene3D.tsx`)
- **Sunset/sunrise transition**: Gradual sky color change over 10s instead of instant
- **Moon mesh**: Visible moon sphere at night
- **Stars**: Point cloud at Y=100, slowly rotating
- **City lights at night**: More point lights scattered at building positions
- **Metro line glow at night**: 2x emissive intensity for tube mesh

### 10. Performance Optimizations
- **Throttle HUD updates**: Every 200ms instead of 150ms
- **Reduce notification cap**: 20 instead of 30
- **Pool drone instances**: Don't unmount/remount — hide/show
- **Reduce particle counts**: Clouds 8→6, rain 200→150

### File Summary

| File | Changes |
|------|---------|
| `Scene3D.tsx` | Camera WASD, auto-center events, better angles, stars, moon, sunset transition |
| `GameCanvas.tsx` | Floating score CSS, combo bar, kill flash, keyboard shortcuts (WASD, Q,E,R,T,Tab,N,G), screen effects |
| `GameEngine.ts` | 10 new features, passive income, chain lightning, evac train, drone EMP, crit hits, population panic, victory lap |
| `types.ts` | New fields: chainLightningTimer, empCooldown, trainShieldId, panicTimers, victoryLapActive |
| `StationNode3D.tsx` | Passenger orbit dots, turret visuals, shelter dome, damage cracks |
| `CityBuildings.tsx` | Color variety, window dots, height variance |
| `TrainModel.tsx` | Night interior glow, capacity indicator, speed trail |
| `ActionBar.tsx` | Text labels, hotkeys, active glow, tooltips |
| `TopBar.tsx` | Combo streak bar, passive income display |
| `constants.ts` | Keyboard shortcut config |

~10 files modified. All additive — no architecture changes.

