

# Phase 14: Grand Fix — Maximum Improvements

## Current State Assessment

The game has solid mechanics (7 update systems, 3 metro lines, drone types, achievements) but suffers from:
1. Metro lines flickering/disappearing due to geometry rebuilds
2. Trains hard to see — GLB model may render tiny or wrong orientation
3. ActionBar dropdowns already improved but need polish (already has grouped dropdowns with full names)
4. Station labels overlapping at center cluster
5. Ground is dark with faint map texture
6. Buildings are basic boxes with minimal atmosphere
7. No minimap for orientation
8. Camera starts zoomed in too much — hard to see full map
9. No tutorial/guidance for new players
10. Explosion effects are basic spheres
11. No sound feedback indicators in UI

## Plan — 8 Major Improvements

### 1. Fix Metro Lines Stability (`MetroLine3D.tsx`)
- The issue: `prevPointsKey` comparison rebuilds geometry on every station set change, and the init curve starts invisible
- Fix: Only rebuild tube geometry when station **count** changes, not when IDs change. Update point positions via vertex manipulation when stations are the same count
- Set init curve at y=0.15 (visible) instead of creating a placeholder
- Double the tube segments for smoother curves
- Add animated dash effect using shader material for line "flow" direction

### 2. Scale & Orient Train Models (`TrainModel.tsx`)
- Increase scale to `[3.0, 3.0, 3.0]` — current 2.0 may still be too small
- Add a ground shadow disc under each train (dark circle at y=0.05)
- Fix angle smoothing: increase lerp factor from 0.25 to 0.4 for snappier rotation
- Add interior glow mesh (small emissive plane inside model for "lit windows" effect)
- Increase Billboard label font size to 1.0 for line name
- Add passenger count always visible (not just when >0) showing "0/6" format

### 3. Enhanced Ground & Atmosphere (`Scene3D.tsx`)
- Increase map texture opacity to `0.5` day / `0.4` night for clearer Kyiv context
- Add grid overlay (subtle line grid at 10-unit intervals) for spatial reference
- Add 4 area lights at corners for more even illumination
- Add ground fog particles (low-lying mist at y=0.5) for atmosphere
- Increase fog far distance to 250
- Better skybox: gradient from horizon color to zenith, not single solid color

### 4. Add Minimap (`ui/Minimap.tsx` — new file)
- Fixed 180x140px panel in bottom-right corner
- Shows all active stations as colored dots (line color)
- Shows trains as moving white dots
- Shows drones as red dots during air raids
- Current camera view frustum shown as a white rectangle
- Semi-transparent dark background matching game-panel-solid

### 5. Improve Start Screen & Tutorial (`GameCanvas.tsx`)
- Add animated Kyiv skyline silhouette behind the title
- Add "Як грати" (How to Play) expandable section with 4 key points:
  1. Buy trains (M1/M2/M3) to transport passengers
  2. Click stations for upgrades and defense
  3. Click drones to shoot them down
  4. Survive air raids, deliver passengers
- Better mode card layout with icons
- Add keyboard shortcut cheat sheet

### 6. Improve Explosion Effects (`ExplosionEffect.tsx`)
- Replace simple expanding spheres with:
  - Initial bright flash (white sphere, 100ms)
  - Expanding orange fireball with particle spray
  - Smoke column rising for 2s after
  - Ground scorch mark (dark disc remaining for 10s)
- Add shockwave ring (expanding torus) at ground level

### 7. Add Minimap & Radar HUD (`ui/Minimap.tsx`)
- Top-down orthographic minimap in corner
- Station dots with line colors
- Drone warning indicators on map edges (red arrows pointing toward incoming drones)
- Train positions as moving dots
- Camera viewport indicator

### 8. Polish TopBar & HUD (`TopBar.tsx`, `GameCanvas.tsx`)
- Add money change indicator (+$X flash in green when money increases)
- Add pulsing border on lives when ≤2
- Add wave progress bar (time until next wave)
- Add air raid timer showing seconds remaining
- Better speed control: visual indicator of current speed with progress bar

## File Summary

| File | Changes |
|------|---------|
| `MetroLine3D.tsx` | Stable geometry, vertex updates, flow animation |
| `TrainModel.tsx` | Larger scale, ground shadow, better labels |
| `Scene3D.tsx` | Brighter map texture, grid overlay, better fog |
| `ui/Minimap.tsx` | New minimap component |
| `GameCanvas.tsx` | Tutorial section, minimap integration |
| `ExplosionEffect.tsx` | Multi-stage explosions with smoke |
| `TopBar.tsx` | Money flash, wave progress, air raid timer |
| `StationNode3D.tsx` | Repair progress ring visual |

~8 files, focusing on maximum visual and UX improvement.

