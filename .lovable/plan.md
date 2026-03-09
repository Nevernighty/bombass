

# Add Hover Sound Effects to Buttons

## Approach
Add a lightweight `playHover()` method to `AudioEngine` — a short, soft high-frequency tick (sine wave, ~1200Hz, 40ms, very low volume). Then expose the audio engine to `ActionBar` and `StationPanel` via a prop so buttons can call it on `mouseEnter`.

## Changes

### 1. `src/game/AudioEngine.ts` — Add `playHover()` method
New method: sine wave at 1200Hz, 0.04s duration, gain 0.06 — subtle tick sound distinct from `playClick()`.

### 2. `src/game/GameCanvas.tsx` — Pass audio ref to ActionBar and StationPanel
Add `onHover={() => audioRef.current.playClick()}` or a dedicated hover callback prop to both `<ActionBar>` and `<StationPanel>`.

### 3. `src/game/ui/ActionBar.tsx` — Wire hover sound
- Accept `onHover` prop
- Call `onHover()` in `ActionBtn`'s `onMouseEnter` and `TrainBtn`'s `onMouseEnter`

### 4. `src/game/ui/StationPanel.tsx` — Wire hover sound
- Accept `onHover` prop
- Call `onHover()` on `GridBtn` and `StatusChip` `onMouseEnter`

### 5. `src/game/ui/TrainPanel.tsx` — Wire hover sound
- Accept `onHover` prop
- Call on `PanelBtn` and line-picker button `onMouseEnter`

