

# Phase 21: Station Panel Overhaul, Anti-Air 3D Models, Main Menu Redesign & Line Color Fix

## Problems

1. **StationPanel is messy** — too many buttons crammed in tabs, no visual hierarchy, no icons or spacing that makes it feel like a game UI
2. **New pending stations get line color** — `StationNode3D` initializes `lineColor` from `METRO_LINES[station.line]` before checking pending status, so the platform ring and other elements still use the line color instead of grey
3. **No 3D anti-air model** — buying AA just shows a tiny cone; should be a visible turret/SAM model that rotates and fires at drones (tower defense feel)
4. **Main menu is bland** — simple grid of cards with no visual variety, no illustrations, no preview of what each mode looks like
5. **Line drawing color issue** — any line color should be attachable to any station; currently stations are hardcoded to their `station.line` color

## Plan — 5 files

### 1. `StationPanel.tsx` — Complete Visual Hierarchy Overhaul
- **Header section**: Larger station icon with circular HP ring (keep), add a colored status bar below header (green=healthy, yellow=damaged, red=critical)
- **Quick status row**: Replace text-only stats with icon+value pairs in a horizontal row (HP heart, passengers icon, income coin, defense shield) — each as a small rounded chip
- **Tab content redesign**:
  - **Defense tab**: 2-column grid of square icon buttons (64x64) with icon centered, label below, cost badge top-right, greyed out state is clear. Group: AA/SAM/Turret on left, Shield/EMP/Interceptor on right
  - **Management tab**: Similar grid but with upgrade, evacuate, open/close, shelter, express, magnet
  - **Info tab**: Clean key-value list with subtle separators, transfer badge highlighted
- **Animations**: Each tab content fades in with staggered delay per button
- Remove redundant props — consolidate button disabled logic

### 2. `StationNode3D.tsx` — Fix Grey Color for Pending Stations
- The `lineColor` variable is set unconditionally from `METRO_LINES[station.line].color` at line 149. The `effectiveColor` in useFrame does switch to grey for pending, BUT the platform ring mesh at line 331-334 uses `lineColor` directly (not effectiveColor)
- Fix: Add a `platformMatRef` for the platform ring material and update its color in useFrame based on pending status
- Also fix the passenger queue `lineColor` prop — pass `isPending` flag and use grey when pending
- The station name text color should also be grey for pending stations (currently always `#e0e0e0`)

### 3. `StationNode3D.tsx` — Enhanced Anti-Air 3D Model (Tower Defense Style)
- Replace the tiny turret group with a proper tower defense turret:
  - **Base**: Wider cylinder (0.5 radius, 0.4 height), metallic dark grey
  - **Rotating head**: Box-shaped housing (0.6 wide) with two barrel cylinders pointing forward
  - **SAM variant**: Taller base + missile tube rack (4 small cylinders angled upward)
  - **Radar dish**: Small rotating disc on top when `radarActive` or `hasSAM`
  - The turret should continuously scan (slow rotation) when no drones are near, snap to nearest drone when one is in range
  - Add a subtle point light at the turret tip when firing (flash effect during `turretCooldown` transition)
- Keep existing rotation logic but make it smoother with lerp

### 4. `GameCanvas.tsx` — Main Menu Redesign
- Replace the plain grid with a more immersive start screen:
  - **Left side**: Large title "KYIV TRANSIT" with "RESILIENCE" subtitle, plus a brief animated tagline
  - **Center**: Scenario cards in a vertical stack or carousel-like layout, each with:
    - Large icon/emoji, scenario name, difficulty stars (not bar), description
    - Distinct border color per difficulty (green/yellow/orange/red/purple)
    - Hover effect: card lifts up, shows "ГРАТИ ▶" button
    - "Classic" highlighted as recommended with a badge
  - **Bottom**: Controls help and version info
  - **Background**: Subtle animated gradient or dark pattern instead of flat color
- Add a "selected scenario" state that shows expanded details before starting

### 5. `GameCanvas.tsx` — Line Color Assignment Fix
- When connecting a pending station, the station's inherent `line` property already determines color (from STATIONS constant). This is correct — each station belongs to a fixed line.
- The issue the user reports ("any color can be attached to any new station") likely means they want the connection visual to work regardless. The current system is correct (red stations connect to red line ends, etc.)
- Ensure the `drawLineColor` properly reflects the source line color during drawing, and the connected station animates from grey → line color with a flash

## Technical Details

### Station Panel button grid
```text
┌─────────────────────────────────────┐
│ [HP ❤️ 85] [👥 3/8] [💰 $5] [🛡️ ППО] │  ← status chips
├─────────────────────────────────────┤
│  Оборона │ Управління │ Інфо        │  ← tabs
├──────────┬──────────┬───────────────┤
│ ┌──────┐ │ ┌──────┐ │               │
│ │ 🎯   │ │ │ 🚀   │ │  2-col grid   │
│ │Зенітк│ │ │ ЗРК  │ │  of 64x64     │
│ │ $80  │ │ │ $120 │ │  buttons      │
│ └──────┘ │ └──────┘ │               │
└──────────┴──────────┴───────────────┘
```

### Anti-Air 3D structure
```text
     [=]==[=]   ← twin barrels
      ┌───┐     ← rotating head housing
      │   │
    ┌─┴───┴─┐   ← base cylinder
    └───────┘
```

## File Summary

| File | Change |
|------|--------|
| `StationPanel.tsx` | Complete redesign: status chips, 2-col icon grid buttons, fade-in animations, cleaner info tab |
| `StationNode3D.tsx` | Fix platform ring + queue + name color for pending (grey). Enhanced AA/SAM 3D model with scan/track rotation |
| `GameCanvas.tsx` | Main menu redesign with vertical scenario cards, difficulty stars, expanded details, animated background. Line color flash on connect |

