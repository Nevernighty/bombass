

# Phase 13: Visual & UI Grand Fix

## Problems from Screenshot

1. **Metro lines appear/disappear** — the `MetroLine3D` rebuilds geometry every time `activeStationIds` changes, causing flicker. The init curve is at y=-100 making lines invisible initially
2. **Trains invisible/hard to see** — GLB model scale may be wrong, no emissive glow, capacity bar too small. The `GLBTrain` clones scene but model might render tiny or facing wrong direction
3. **Bottom ActionBar dropdowns transparent/unreadable** — `game-panel` uses `backdrop-filter: blur(16px)` but the dropdown sits over a 3D canvas where blur doesn't work well. Text is 9-11px, barely readable
4. **StationPanel also transparent** — same `game-panel` issue, needs solid dark background
5. **Overall dark/poor graphics** — too many dim pointLights, buildings barely visible, ground texture too faint

## Plan (~6 files)

### 1. Fix Metro Lines Flickering (`MetroLine3D.tsx`)
- Move init curve to y=0.2 (visible range) instead of y=-100
- Add `smoothTransition`: don't rebuild geometry unless station count changes, just update point positions
- Keep geometry stable when only train positions move
- Add thicker core tube (radius 0.9) with brighter emissive (0.7)

### 2. Fix Train Visibility (`TrainModel.tsx`)
- Scale GLB model larger: `[2.0, 2.0, 2.0]` instead of `[1.0, 1.0, 1.0]`
- Add colored emissive glow ring under the train (line-colored ring at y=0.1)
- Increase headlight intensity: `3.0` at night
- Larger capacity bar: width 1.8, height 0.12
- Add Billboard label always visible (not just when passengers > 0) showing line name like "M1"
- Increase lerp factor to `delta * 12` for snappier movement

### 3. Fix ActionBar Dropdowns (`ActionBar.tsx`)
- Replace `game-panel` on dropdown with solid dark background: `background: rgba(12, 16, 28, 0.97)` + stronger border
- Increase dropdown width to `280px`
- Increase font sizes: fullName `13px`, description `11px`, cost `12px`
- Add subtle left border accent color to each dropdown item
- Dropdown header buttons: increase padding, font size `13px`
- Add solid background to the bottom bar itself: `rgba(10, 14, 24, 0.95)`
- Train buttons: larger `52x52px`

### 4. Fix StationPanel Readability (`StationPanel.tsx`)
- Replace `game-panel` with solid background: `background: rgba(10, 14, 24, 0.97)`
- Increase station name to `16px`, section headers to `11px`
- Button font size increase to `13px`
- Wider panel: `w-96` instead of `w-80`
- More padding: `px-5 py-4`

### 5. Brighten 3D Environment (`Scene3D.tsx`)
- Increase ambient light: `0.5` day, `0.45` night
- Increase directional light: `0.9` day
- Push fog further: `80, 200` instead of `60, 150`
- Map texture opacity: `0.35` night, `0.45` day (brighter)
- Ground color lighter: `#0e1428`

### 6. CSS Panel Fix (`index.css`)
- Add `.game-panel-solid` class with opaque dark background, no backdrop-filter dependency
- Increase `.game-panel` opacity from 0.9 to 0.97

## File Summary

| File | Changes |
|------|---------|
| `MetroLine3D.tsx` | Fix init curve y position, stable geometry, thicker/brighter lines |
| `TrainModel.tsx` | Scale up GLB, add glow ring, brighter lights, always-visible label |
| `ActionBar.tsx` | Solid dark dropdown bg, larger fonts, wider dropdowns, bigger train buttons |
| `StationPanel.tsx` | Solid bg, larger fonts, wider panel |
| `Scene3D.tsx` | Brighter lighting, further fog, brighter map texture |
| `index.css` | Increase game-panel opacity, add solid variant |

