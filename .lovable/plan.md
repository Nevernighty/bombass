

# Phase 19: Metro Lines Always On Top + Polished Interactive UI

## Core Problems

1. **Metro lines rendered behind buildings** — Both use `renderOrder` but Three.js `renderOrder` alone doesn't solve occlusion with depth testing enabled. Buildings at `renderOrder: 5` with depth testing still occlude lines at `renderOrder: 10` because the depth buffer doesn't respect render order for opaque geometry.
2. **UI is cluttered with dropdowns** — ActionBar uses hover dropdowns that feel disconnected; no visual affordance for what costs what or what's active. Station/Train panels are text walls with no visual hierarchy.
3. **No meaningful interactivity beyond clicking** — No drag interactions, no line drawing, no visual feedback loops that make Mini Metro addictive.
4. **Event system exists but is invisible** — Events show as small badges in the corner; no dramatic entry or player response required.

## Plan — 6 files

### 1. MetroLine3D.tsx — Fix Depth Rendering
The actual fix: set `depthTest: false` on the main tube material AND glow, not just `depthWrite: false`. This ensures lines always render on top regardless of building geometry. Also increase `TUBE_RADIUS` to `0.30` for better visibility, and `GLOW_RADIUS` to `0.50`.

Additionally, replace `tubeGeometry` for the main line with a flat ribbon approach (similar to RiverPlane) that renders as a 2D-looking line at a higher Y position (y=1.0 instead of 0.3), ensuring it's physically above buildings too.

### 2. CityBuildings.tsx — Lower & Transparent
- Set `depthWrite: false` and `opacity: 0.7` on building material so buildings never write to the depth buffer, preventing them from blocking lines
- Lower max building height: towers max 5 (from 10), apartments max 3 (from 5)
- Set building Y position slightly lower

### 3. ActionBar.tsx — Visual Overhaul (Mini Metro Style)
Complete rewrite of the bottom bar to be cleaner and more game-like:
- Replace dropdown groups with **icon-based toolbar** — a single row of circular/rounded buttons with icons, no text labels until hover
- Each button shows: icon + cost badge + cooldown overlay (radial progress)
- Color-code by category: blue=defense, green=economy, orange=emergency, purple=network
- Active abilities show a glowing ring animation
- Insufficient funds = greyed out with shake on click
- Train buy buttons become larger, more prominent with mini train silhouette
- Add **hotkey hints** as small corner badges on each button
- Tooltip appears above on hover with name + description + cost

### 4. StationPanel.tsx — Cleaner Layout
- Add **tabbed sections** instead of one long scroll: "Оборона" | "Управління" | "Інфо"
- Each tab shows 3-4 buttons max with larger icons and clearer visual state
- Add a **mini map indicator** showing the station's position on the line
- HP bar becomes a circular progress ring around the station icon
- Passenger shapes become a visual grid with animation on new arrivals

### 5. TrainPanel.tsx — Compact & Visual
- Show a **mini train visualization** at the top with wagon count and fill level
- Reroute buttons become a visual line picker: show the 3 colored lines as horizontal bars, click to switch
- Add current station name and next station with ETA

### 6. GameCanvas.tsx — Better Event Presentation
- Active events get a **full-width banner** at the top that slides in/out with icon + description + timer bar
- Hover tooltip follows cursor position (use mouse coordinates) instead of being fixed in corner
- Add **contextual action hints**: when hovering a station during air raid, show "Клік = Щит" hint

## Technical Details

### Depth rendering fix (the key insight)
```
// MetroLine3D main tube:
<meshStandardMaterial
  depthTest={false}    // <-- THIS is the fix
  depthWrite={false}
  renderOrder={10}
/>

// CityBuildings:
<meshStandardMaterial
  depthWrite={false}   // Buildings don't write depth
  transparent
  opacity={0.7}
/>
```

### ActionBar icon toolbar structure
```text
┌──────────────────────────────────────────────────────────┐
│  [M1] [M2] [M3]  |  🛡️ 🎯 📡 ⚡  |  💰 📦 ❤️  |  🚨 🌙 🔧 ⚡ │
│  train buttons     defense         economy      emergency   │
└──────────────────────────────────────────────────────────┘
```
Each button is a 40x40 circle with icon, radial cooldown ring overlay, and cost badge.

## File Summary

| File | Key Change |
|------|-----------|
| `MetroLine3D.tsx` | `depthTest: false` on materials, raise Y to 1.0, radius 0.30 |
| `CityBuildings.tsx` | `depthWrite: false`, lower heights, opacity 0.7 |
| `ActionBar.tsx` | Icon-based toolbar with radial cooldowns, no dropdowns |
| `StationPanel.tsx` | Tabbed layout, circular HP ring, cleaner button grid |
| `TrainPanel.tsx` | Mini train viz, visual line picker, current station info |
| `GameCanvas.tsx` | Cursor-following tooltip, full-width event banners, action hints |

