

# Phase 18: Grand Overhaul — Mini Metro-Inspired Interaction, Visuals & Gameplay

## Current Problems (from screenshot & code analysis)

1. **Metro lines invisible/missing** — `TUBE_RADIUS=0.08` is too thin to see at default zoom; lines get hidden behind buildings
2. **Buildings block lines** — buildings rendered at same z-order, no depth sorting or transparency for metro visibility
3. **No hover/selection feedback on most elements** — clicking buildings shows a tooltip but no glow, no selection state; no hover highlighting on lines
4. **UI buttons feel disconnected** — ActionBar dropdown items are text-heavy with no visual feedback for what they do; no contextual tooltips
5. **No line drawing/reconnecting mechanic** — Mini Metro's core is drawing lines between stations; this game has no equivalent interactive system
6. **Passenger animations are just orbiting dots** — no walking, no queuing, no visual personality
7. **No events/missions system visible** — game feels static between air raids
8. **Drone attacks feel disconnected** — drones fly to stations, damage happens, but no clear visual cause-and-effect with buildings

## Design Philosophy — Learn from Mini Metro/Mini Motorways

- **Direct manipulation**: click-drag to draw/extend/modify lines, not just menu buttons
- **Visual clarity**: lines must be clearly visible, color-coded, never hidden
- **Hover everything**: every interactive element glows/scales on hover with a tooltip
- **Passenger personality**: passengers are distinct shapes waiting at platforms, visually queueing
- **Events as gameplay**: periodic events that require player response (bridge closure, rush hour surge, power outage)

## Plan — 8 files changed

### 1. MetroLine3D.tsx — Make Lines Visible & Interactive
- Increase `TUBE_RADIUS` from 0.08 → **0.25** and `GLOW_RADIUS` from 0.15 → **0.4**
- Set `renderOrder: 10` and `depthWrite: false` on glow material so lines render **on top of buildings**
- Add **hover detection** on the tube mesh — on hover, increase emissive by 0.5 and show line name billboard
- Add **closed segment visual**: where `closedSegments` exist, render a red X marker mesh at the midpoint
- Pulse the energy sphere slightly larger (scale 0.4 base)

### 2. CityBuildings.tsx — Don't Block Metro Lines
- Set building `renderOrder: 5` (below lines at 10)
- Add **hover glow**: on pointer enter, increase emissive by 0.3 and show building name + HP tooltip
- Make buildings slightly **transparent** (opacity 0.85) so lines remain visible through them
- On click, show an expanded info panel (building name, district, HP bar, station it belongs to)
- Add **repair building** action: if damaged, click to spend $10 to repair

### 3. StationNode3D.tsx — Better Hover & Selection
- On hover: scale up to 1.25x with spring animation, show expanded tooltip (station name, line, passengers, HP, available actions)
- On click: pulse white ring outward, open station panel
- Add **passenger queue visualization**: instead of orbiting dots, show small shapes (matching passenger shape) arranged in a line extending outward from the station, like Mini Metro's passenger queue
- Queue grows visually as passengers accumulate, with a warning color shift at 75% capacity

### 4. TrainModel.tsx — Better Visual Feedback
- On hover: show tooltip with line, passengers, level, speed
- Increase base scale from 0.25 → **0.4** for better visibility
- Add **wagon chain**: if train level > 1, render additional wagon meshes behind the lead (offset -1.5 per wagon along movement axis)
- Smoother dwelling animation: gentle up-down bob (0.1 amplitude) instead of static

### 5. GameCanvas.tsx — Hover Tooltip System + Event Ticker
- Add a **unified tooltip system**: a floating HTML div that follows the cursor showing contextual info for whatever 3D element is hovered (station, train, building, drone)
- Add **event ticker**: a horizontal scrolling bar at the top-center showing recent game events ("Дрон збитий!", "Станцію пошкоджено", "Хвиля 3 починається")
- Add **building click handler**: wire building clicks to a repair action or info panel

### 6. ActionBar.tsx — Contextual Actions & Better Visual Feedback
- Add **icon badges** to dropdown categories showing count of available/active items
- Add **flash animation** when a new ability becomes available (affordable)
- Show **cooldown timers** as circular progress rings on buttons, not just text
- Add tooltips on hover for each button explaining what it does
- Move train buy buttons to show **mini train preview** on hover

### 7. GameEngine.ts — Dynamic Events System
- Add **random events** every 45-90s:
  - "Rush Hour Surge" — double passenger spawns for 15s
  - "Power Fluctuation" — 50% chance stations flicker (visual only)
  - "VIP Passenger" — special golden passenger worth 5x points
  - "Emergency Evacuation" — one station overflows, must reroute trains
- Add `activeEvents: GameEvent[]` to state with `{ id, type, timer, data }`
- Add `repairBuilding(state, buildingIdx)` — costs $10, restores 25 HP

### 8. types.ts — Add GameEvent type
- Add `GameEvent` interface: `{ id: string; type: string; timer: number; data: any }`
- Add `activeEvents: GameEvent[]` to GameState
- Add `hoveredElement: { type: 'station' | 'train' | 'building' | 'drone'; id: string } | null` to GameState

## Visual Priority Fix
The key rendering order:
1. Ground plane (renderOrder 0)
2. River (renderOrder 2)
3. Buildings (renderOrder 5, opacity 0.85)
4. Metro lines (renderOrder 10, depthWrite false on glow)
5. Stations (renderOrder 15)
6. Trains, drones, effects (renderOrder 20+)

This ensures lines are always visible through buildings.

## File Summary

| File | Key Change |
|------|-----------|
| `MetroLine3D.tsx` | Thicker visible lines (0.25), render on top of buildings, hover glow, closed segment X markers |
| `CityBuildings.tsx` | Semi-transparent (0.85), hover glow, render below lines, repair action |
| `StationNode3D.tsx` | Passenger queue visualization (shaped line), better hover/selection feedback |
| `TrainModel.tsx` | Scale 0.4, wagon chain for upgrades, hover tooltip, dwelling bob |
| `GameCanvas.tsx` | Unified hover tooltip system, event ticker, building repair wiring |
| `ActionBar.tsx` | Cooldown rings, flash on affordable, hover tooltips, icon badges |
| `GameEngine.ts` | Random events system, repairBuilding(), VIP passengers |
| `types.ts` | GameEvent interface, activeEvents array, hoveredElement |

