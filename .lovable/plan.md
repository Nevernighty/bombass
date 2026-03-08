

# Phase 17: Advanced Line Management & Train Interaction System

## What Exists Now

- `rerouteTrain()` exists in GameEngine but is **never exposed in UI** — no way for players to reassign trains to different lines
- `mergeTrains()` exists but also **never exposed in UI**
- Train click only does `reverseTrain()` + sets `selectedTrain`
- ActionBar shows train upgrade/shield only when a train is selected — no reroute option
- No way to close/reopen/reconnect metro line segments
- No train detail panel (unlike stations which have StationPanel)

## Plan — 4 files

### 1. New: `ui/TrainPanel.tsx` — Interactive Train Detail Panel
When a train is selected (clicked), show a panel similar to StationPanel with:
- **Train info**: line, passengers/capacity, level, speed, current station
- **Reroute buttons**: 3 colored buttons (M1/M2/M3) to reassign train to a different line — calls `rerouteTrain()`
- **Merge button**: if another train on same line is nearby, offer to merge — calls `mergeTrains()`
- **Upgrade/Shield** buttons (moved from ActionBar dropdown into this panel)
- **Reverse direction** button
- **Detach/sell train** button ($25 refund, removes train) — new `sellTrain()` function
- Visual: slide-in from right side, same dark panel style as StationPanel

### 2. New: `GameEngine.ts` — Line Management Functions
Add these new functions:
- `sellTrain(state, trainId)` — remove train, refund $25, dump passengers at nearest station
- `closeLineSegment(state, line, fromStationId, toStationId)` — temporarily block a segment between two stations (trains reverse at the gap). Costs $15, lasts 30s. Useful for defense
- `reopenLineSegment(state, line)` — remove segment closure
- Add `closedSegments: {line: string, from: string, to: string, timer: number}[]` to GameState
- In `updateTrains()`: check if next segment is closed → force train to dwell/reverse at the gap boundary

### 3. Updated: `ActionBar.tsx` — Line Control Dropdown
Add a 5th dropdown group **"Мережа" (Network)** with:
- Close/reopen line segments (per line)
- Express line activation (moved here for logical grouping)
- Speed boost (moved here)
- Remove transport items from conditional selectedTrain check — they move to TrainPanel

### 4. Updated: `GameCanvas.tsx` — Wire TrainPanel
- When `selectedTrain` is set, show TrainPanel instead of (or alongside) the train options in ActionBar
- Pass reroute/merge/sell/reverse handlers
- Add `onTrainSelect` callback that sets selectedTrain and opens panel
- Close panel on clicking elsewhere or pressing Escape

### 5. Updated: `types.ts` — Add closedSegments to GameState
- Add `closedSegments` array field

## File Summary

| File | Change |
|------|--------|
| `ui/TrainPanel.tsx` | New panel: reroute to M1/M2/M3, merge, sell, upgrade, shield, reverse |
| `GameEngine.ts` | Add `sellTrain()`, `closeLineSegment()`, `reopenLineSegment()`, segment check in `updateTrains()` |
| `ActionBar.tsx` | Add "Мережа" dropdown with line control actions, simplify transport group |
| `GameCanvas.tsx` | Integrate TrainPanel, wire new handlers |
| `types.ts` | Add `closedSegments` to GameState |

