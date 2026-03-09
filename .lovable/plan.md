

# Responsive + Bilingual (UA/EN) Overhaul

## Current Issues
- **TopBar**: Horizontal flex with ~15 stat items, overflows on mobile (no wrapping)
- **ActionBar**: Fixed bottom dock with 5 groups of buttons, too wide for mobile
- **StationPanel / TrainPanel**: Fixed `280px`/`270px` width, positioned `left-3`/`right-3` — overlaps on small screens
- **WorldMap**: Fixed `320px` width, bottom-left positioning conflicts with StationPanel
- **CrossCityAlert**: `right-3 top-16`, overlaps TopBar on mobile
- **Minimap**: `bottom-20 right-2`, overlaps ActionBar on mobile
- **Start screen**: Grid works but controls section cramped on small screens
- **Language**: All strings hardcoded in Ukrainian — no toggle exists

## Plan

### 1. Create `src/game/i18n.ts` — Translation System
- Simple key-value map with `ua` and `en` translations (~120 keys)
- Cover: TopBar labels, ActionBar sections/tooltips, StationPanel tabs/buttons, TrainPanel labels, WorldMap, CrossCityAlert, start screen, game over screen, event notifications
- `useLanguage()` hook with React context storing `lang` in localStorage
- `t(key)` function returns translated string
- Language toggle component (UA/EN flag buttons)

### 2. Update `src/game/ui/TopBar.tsx` — Mobile Responsive
- On mobile (`< 768px`): collapse into 2 rows
  - Row 1: City badge, score+combo, money, hearts
  - Row 2: Speed controls, wave badge, time, key stats (passengers, drones)
- Hide secondary stats (energy, satisfaction, weather icons) behind a collapsible "..." button on mobile
- Replace all hardcoded Ukrainian text with `t()` calls

### 3. Update `src/game/ui/ActionBar.tsx` — Mobile Layout
- On mobile: horizontal scrollable container instead of fixed flex
- Reduce button size from 40px to 36px on mobile
- Collapse section labels
- Hide tooltips on touch devices (they don't work well)
- Wrap in a `ScrollArea` or `overflow-x-auto` container
- Replace all UA strings with `t()` calls

### 4. Update `src/game/ui/StationPanel.tsx` — Full-Width Mobile
- On mobile: render as bottom sheet (full width, slides up from bottom) instead of side panel
- Use `max-h-[60vh]` with overflow scroll on mobile
- Replace hardcoded UA strings with `t()`

### 5. Update `src/game/ui/TrainPanel.tsx` — Mobile Adaptation
- On mobile: render as bottom sheet like StationPanel
- Replace hardcoded line names (`M1`/`M2`/`M3`) and UA text with `t()`

### 6. Update `src/game/ui/WorldMap.tsx` — Mobile Responsive
- On mobile: render as fullscreen overlay instead of small floating panel
- Touch-friendly city nodes (larger hit areas)
- Replace UA strings with `t()`

### 7. Update `src/game/ui/CrossCityAlert.tsx` — Mobile Positioning
- On mobile: position at bottom-center above ActionBar instead of top-right
- Smaller width on mobile, stack vertically
- Replace UA strings with `t()`

### 8. Update `src/game/ui/Minimap.tsx` — Hide on Mobile
- Hide minimap on very small screens (< 640px) — the world map serves the same purpose
- Optionally show as a toggle button

### 9. Update `src/game/GameCanvas.tsx` — Language Toggle + Mobile Start Screen
- Add language toggle button (UA 🇺🇦 / EN 🇬🇧) to start screen and in-game TopBar
- Wrap app in `LanguageProvider`
- Start screen: single column on mobile, smaller title, compact controls grid
- Game over screen: responsive stat grid
- Replace all UA strings with `t()` calls
- Pass `useIsMobile()` result to child components that need layout switching

### 10. Update `src/game/ui/CameraControls.tsx` — Mobile Touch
- On mobile: move to bottom-right, above ActionBar, slightly larger touch targets (44px)

### 11. Update `src/index.css` — Mobile Utilities
- Add `@media (max-width: 768px)` overrides for `.stat-micro`, `.section-label`, `.kbd-key`
- Reduce font sizes and padding for mobile
- Add bottom-sheet animation keyframes

## Translation Coverage (key examples)
| Key | UA | EN |
|-----|----|----|
| `topbar.wave` | ХВИЛЯ | WAVE |
| `topbar.victory` | ПЕРЕМОГА | VICTORY |
| `topbar.peak` | ПІК | RUSH |
| `action.trains` | ПОТЯГИ | TRAINS |
| `action.defense` | ОБОРОНА | DEFENSE |
| `action.economy` | ЕКОНОМІКА | ECONOMY |
| `action.emergency` | АВАРІЙНЕ | EMERGENCY |
| `action.network` | МЕРЕЖА | NETWORK |
| `station.defense_tab` | ОБОРОНА | DEFENSE |
| `station.manage_tab` | КЕРУВ. | MANAGE |
| `gameover.title` | ГАМОВЕР | GAME OVER |
| `start.subtitle` | Керуй транспортом... | Manage transit... |
| ~120 more keys | ... | ... |

## Key Decisions
- `useIsMobile()` hook already exists — reuse it for layout switching
- Language stored in localStorage, defaults to `ua`
- No external i18n library needed — simple context + object lookup
- Mobile panels use bottom-sheet pattern (slide up from bottom, full width)
- ActionBar becomes horizontally scrollable on mobile rather than wrapping

