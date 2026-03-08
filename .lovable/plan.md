

# Fix: Cross-Line Station Connections, Solid UI Panels, Performance

## Problems Identified

1. **Station connections only work within the same line** — `getValidPendingTargets()` checks `LINE_STATIONS[line]` for the source station's line only. If a pending station belongs to a different line (e.g., green station near red end), it's never a valid target. User wants ANY end station to connect to ANY pending station regardless of line.

2. **StationPanel/TrainPanel backgrounds are transparent** — `hsla(var(--game-glass), 0.97)` resolves to `hsla(220, 20%, 12%, 0.97)` which is nearly opaque but over the 3D canvas it still looks washed out. The panels use many `hsla()` values with low alpha for sub-elements making text unreadable. The screenshot confirms this — buttons have barely visible borders, costs float in space.

3. **Performance** — Scene renders 6+ point lights at night, clouds, ambient particles, rain, skybox sphere, city buildings, etc. all simultaneously. No LOD or conditional rendering.

## Plan — 4 files

### 1. `GameEngine.ts` — Remove line restriction from connections

**`getValidPendingTargets()`**: Currently only returns pending stations adjacent on the SAME line as the source. Change to:
- Find the source station's world position
- Return ALL pending stations sorted by distance, within a reasonable range (or just all of them)
- No line restriction — any end station can connect to any pending station
- The pending station then gets added to `activeStationIds` and auto-assigned to whatever line it already belongs to (its `station.line` property)

**`connectStation()`**: Remove the validation that target must be on the same line. Just verify: source is active, target is pending. Move target from `pendingStations` to `activeStationIds`. Recache all lines.

**`isEndStation()`**: Keep as-is — still checks if station is first/last on any line.

### 2. `StationPanel.tsx` — Solid opaque dark backgrounds

Replace all `hsla(var(--game-glass), 0.4)` with solid dark colors:
- Main panel: `rgba(8, 12, 24, 0.98)` with `backdrop-filter: blur(12px)`
- Buttons: `rgba(20, 28, 45, 0.95)` background, `1px solid rgba(255,255,255,0.08)` border
- Status chips: `rgba(15, 22, 38, 0.9)` 
- Tabs: solid `rgba(12, 18, 32, 1)` background
- Active tab: brighter accent, solid underline
- All text: ensure minimum `rgba(200,210,230,0.9)` for readability
- Cost labels: bright green `#4ade80` or red `#ef4444`, no transparency
- Increase font sizes: labels from 9px to 11px, costs from 9px to 10px

### 3. `TrainPanel.tsx` — Same solid background treatment
- Same pattern: solid dark backgrounds, readable text, no transparent buttons
- Consistent with StationPanel style

### 4. `Scene3D.tsx` — Performance: reduce night lights, conditional rendering
- Night: reduce from 6 point lights to 2
- Clouds/AmbientParticles: only render when zoom > 0.3 (not when zoomed out far)
- Skybox sphere: reduce segments from 32x16 to 16x8
- Shadow map: reduce from 1024 to 512

## File Summary

| File | Change |
|------|--------|
| `GameEngine.ts` | Remove line restriction from `getValidPendingTargets` and `connectStation` — any end station connects to any pending station |
| `StationPanel.tsx` | Solid opaque backgrounds, larger text, readable costs, no transparent buttons |
| `TrainPanel.tsx` | Same solid background treatment |
| `Scene3D.tsx` | Reduce point lights, lower shadow map, conditional cloud/particle rendering |

