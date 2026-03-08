

# Fix: Rubber-Band Line Drawing from End Stations to Pending Stations

## Problems Identified

1. **Click-click instead of click-drag**: Current code uses two separate clicks (click active station → click pending station). The user expects click-and-hold on an end station, drag to pending station with a rubbery visual line, release to connect.
2. **Any active station starts drawing**: Should only allow from **end stations** (first or last active station on each line).
3. **No rubber-band visual**: No 3D line follows the mouse from source to cursor during drag.
4. **No line-color matching**: Pending stations should be grey. The rubber-band line should show the color of the source station's line. On connection, the station takes that line's color.
5. **connectStation doesn't validate adjacency**: Should only connect a pending station that belongs to the same line as the source end station and is the next one in the unlock order.

## Plan — 5 files

### 1. `types.ts` — Add drag world position
- Add `drawMouseWorldPos: { x: number; z: number } | null` to GameState for tracking the cursor's 3D world position during drag
- Add `drawLineColor: string | null` to know which line color to show

### 2. `GameEngine.ts` — Fix connectStation + add helper
- Add `getLineEndStations(state, line)` → returns `[firstActiveId, lastActiveId]` for each line
- Add `isEndStation(state, stationId)` → checks if station is first/last on any line
- Add `getNextPendingForLine(state, line, endStationId)` → returns the pending station that should come next after this end station based on UNLOCK_ORDER
- Fix `connectStation()`: validate that pendingStation is next in unlock order for the source station's line
- Initialize `drawMouseWorldPos: null` and `drawLineColor: null` in `createInitialState`

### 3. `GameCanvas.tsx` — Click-drag interaction
- Replace the click-click flow with mousedown/mousemove/mouseup:
  - `handleStationClick` → when clicking an end station with pending stations available, set `isDrawingLine=true`, `drawLineFrom=stationId`, `drawLineColor=lineColor`
  - The existing `handleMouseMove` → when `isDrawingLine`, use raycasting or screen-to-world conversion to update `drawMouseWorldPos` in stateRef
  - `handleMouseUp` → if `isDrawingLine` and mouse is over a valid pending station, call `connectStation()`. Otherwise cancel.
  - Actually simpler: keep click-based but add the visual. User clicks end station → rubber line appears → moves with mouse → clicks pending station → connects. This matches the user's "click and hold" description better as "click, move, click".
- Actually re-reading: "click and hold - and nothing" — means they want **press-hold-drag-release**:
  - `onPointerDown` on end station → start drawing
  - `onPointerMove` globally → update rubber line position  
  - `onPointerUp` on pending station → connect
  - `onPointerUp` elsewhere → cancel

### 4. `Scene3D.tsx` — Rubber-band 3D line
- New component `DrawingLine`: when `isDrawingLine && drawLineFrom && drawMouseWorldPos`:
  - Get source station world position
  - Draw a tube from source to `drawMouseWorldPos` with the source line's color
  - Use `depthTest: false` so it renders on top
  - Animate slight wobble/pulse for "rubbery" feel
  - Add a glowing endpoint sphere at the cursor position

### 5. `StationNode3D.tsx` — Highlight valid targets during drawing
- When `isDrawingLine` is true, check if this pending station is a valid target for the current `drawLineFrom`
- If valid: brighter pulse ring, larger scale, show "↓ Підключити" label
- If not valid pending station: dim it slightly
- On `onPointerUp` (not just click): if drawing and this is a valid pending station, trigger connection

## Connection Animation
When mouse reaches the pending station and releases:
1. Rubber line "snaps" into place (transition from cursor endpoint to station position)
2. Station flashes from grey to line color with a radial pulse
3. Line extends with a quick grow animation
4. Notification: "✅ Станцію підключено до M1!"

## Validation Rules
- Source must be first or last active station on its line
- Target must be in `pendingStations`
- Target must belong to the same line as source (check LINE_STATIONS)
- Target must be the next station in UNLOCK_ORDER adjacent to the end

## File Summary

| File | Change |
|------|--------|
| `types.ts` | Add `drawMouseWorldPos`, `drawLineColor` |
| `GameEngine.ts` | Add `isEndStation()`, `getLineEndStations()`, fix `connectStation()` validation |
| `GameCanvas.tsx` | Replace click-click with pointerdown-drag-pointerup flow, track world position |
| `Scene3D.tsx` | Add `DrawingLine` component — rubber-band tube from source to cursor |
| `StationNode3D.tsx` | Highlight valid pending targets during drawing, handle pointerUp for connection |

