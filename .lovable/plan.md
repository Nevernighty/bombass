

# Phase 12: GLB Models, Map Background, Readable UI, Station Spacing

## Core Problems

1. **Custom GLB models exist but are unused** — `shahed_136.glb`, `molniya_uav.glb`, `uav_gerbera_low-poly.glb`, `metro_wagon_type_d.glb`, `metro_2033_train.glb` sit in `/public/models/` while the game uses hand-coded box/cylinder geometry
2. **ActionBar still uses cryptic abbreviations** — ЩИТ, РДР, ПРМ, ГЛШ, СГН, ДСТ, НІЧ, РЕМ, ГЕН are meaningless to players. Only M1/M2/M3 should stay as short labels
3. **Black void background** — should use the Kyiv reference map as a ground texture for geographic context
4. **Stations still too close** — center cluster overlaps, especially transfer stations. Need 2x more spread
5. **StationPanel abbreviations** — same problem, ПРО/ЗРК/ЕМІ need full readable labels

## Plan (~8 files)

### 1. Load & Use GLB Models for Drones (`DroneModel.tsx`)
- Replace `ShahedDrone`, `MolniyaDrone`, `GerberaDrone` procedural components with `useGLTF` loading actual models:
  - `shahed_136.glb` for shahed type
  - `molniya_uav.glb` for molniya type  
  - `uav_gerbera_low-poly.glb` for gerbera type
- Keep all existing behavior (hover reticle, danger ring, hit flash, stunned flicker, smoke trail)
- Scale models appropriately (inspect each, likely 0.5-2.0 range)
- Preload all 3 models with `useGLTF.preload()`

### 2. Load & Use GLB Models for Trains (`TrainModel.tsx`)
- Replace `ProceduralTrain` with loaded `metro_wagon_type_d.glb` model
- Keep capacity bar, running lights, headlights, shield sphere, selection ring, passenger count
- Scale to match current visual footprint (~1.3x)
- Apply line color to the model material dynamically
- Preload model

### 3. Kyiv Map Ground Texture (`Scene3D.tsx`)
- Load `reference_map_1.png` or `reference_map_2.png` as a `THREE.TextureLoader` texture
- Apply to ground plane as a semi-transparent overlay (opacity 0.3-0.4) so metro lines are still visible
- Scale/position to align roughly with station positions
- Keep dark tint so it doesn't overpower the game visuals
- This gives geographic context without cluttering

### 4. Spread Stations Much Further (`constants.ts`)
- Increase `MAP_WIDTH` from 140 → 200 and `MAP_HEIGHT` from 115 → 160
- Red line: spread x from 0.04-0.93 → 0.02-0.98 (wider horizontal spread)
- Blue line: spread y from 0.04-0.95 → 0.02-0.98 (wider vertical)
- Green line: spread both axes outward more
- Transfer cluster: push Teatralna/Khreshchatyk/Maidan/Palats Sportu/Zoloti Vorota further apart (minimum 0.08 separation between any two transfer stations)
- Increase building exclusion radius from 3.5 → 5.0 in CityBuildings

### 5. ActionBar Overhaul — Grouped Dropdowns (`ActionBar.tsx`)
- Replace flat row of 16+ cryptic buttons with **4 dropdown groups**:
  - **Транспорт** (M1, M2, M3, Апгрейд, Щит) — keep M1/M2/M3 as direct buttons, rest in dropdown
  - **Оборона** (Радар, Приманка, Глушилка, Сигнал) — dropdown with full Ukrainian names + descriptions
  - **Економіка** (Подвійний тариф, Десант, Фонд) — dropdown
  - **Термінові** (Стоп, Блекаут, Ремонт, Генератор) — dropdown
- Each dropdown item shows: full name, one-line description, cost, hotkey
- Dropdown opens on hover/click, closes on mouse leave
- M1/M2/M3 remain as direct icon buttons (they're clear enough)
- Active timers shown as badges on group headers

### 6. StationPanel Full Labels (`StationPanel.tsx`)
- Replace all abbreviations with full names in buttons:
  - "ПРО" → "Зенітка" (short enough, clear)
  - "ЗРК" → "Ракетний комплекс"
  - "Турель" stays
  - "Перехоплювач" stays
  - "ЕМІ" → "EMP імпульс"
- Each button already has tooltip, so just fix the visible label text

### 7. Ground Plane Update (`Scene3D.tsx`)
- Load texture in GroundPlane component using `useLoader(THREE.TextureLoader, ...)`
- Apply with low opacity, dark-tinted, to maintain game visibility
- Adjust plane size to match new MAP_WIDTH/HEIGHT

### 8. Building Exclusion Update (`CityBuildings.tsx`)
- Increase station exclusion radius to 5.0 to prevent overlap with spread stations
- Adjust building scatter range to match new map dimensions

## File Summary

| File | Changes |
|------|---------|
| `DroneModel.tsx` | Replace 3 procedural drones with GLB model loading |
| `TrainModel.tsx` | Replace procedural train with GLB metro wagon model |
| `Scene3D.tsx` | Add Kyiv map texture to ground, adjust plane size |
| `constants.ts` | Spread all station coords, increase map dimensions |
| `ActionBar.tsx` | Replace flat abbreviation buttons with grouped dropdowns |
| `StationPanel.tsx` | Replace abbreviation labels with full Ukrainian names |
| `CityBuildings.tsx` | Increase exclusion radius, match new map size |

~7 files. Priority: GLB models first, then station spacing, then UI dropdowns.

