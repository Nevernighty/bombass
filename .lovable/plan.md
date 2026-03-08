

# Phase 11: Readable UI, Proper Tooltips, Spread-Out Stations

## Problems from Screenshots

1. **ActionBar abbreviations are cryptic** — "РДР", "ПРМ", "ГЛШ", "СГН", "ДСТ" mean nothing to players. No way to discover what they do.
2. **Stations clustered in center** — transfer stations overlap badly, labels overlap, ugly mess in the middle of the map.
3. **StationPanel abbreviations equally opaque** — "ПРО", "ЗРК", "ЕМІ" with no explanation.
4. **No hover tooltips anywhere** — zero discoverability for game mechanics.

## Plan (~5 files)

### 1. Spread Station Positions (`constants.ts`)
- Multiply coordinate spread by ~1.8x from center, moving transfer stations apart:
  - Teatralna: (0.42, 0.44) → (0.38, 0.46)
  - Khreshchatyk: (0.50, 0.40) → (0.54, 0.38)
  - Maidan: (0.46, 0.46) → (0.46, 0.52)
  - Palats Sportu: (0.38, 0.42) → (0.34, 0.44)
  - Zoloti Vorota: (0.34, 0.34) → (0.30, 0.32)
  - Palats Ukraina: (0.42, 0.62) → (0.40, 0.66)
  - Klovska: (0.46, 0.48) → (0.50, 0.50)
  - Pecherska: (0.50, 0.52) → (0.56, 0.54)
  - Druzhby Narodiv: (0.48, 0.58) → (0.52, 0.62)
  - Also spread green line tail stations outward more
- Increase `MAP_WIDTH` from 100 → 130 and `MAP_HEIGHT` from 80 → 110 for more space

### 2. ActionBar with Rich Tooltips (`ActionBar.tsx`)
- Each button gets a `description` and `fullName` prop
- On hover: show a glass tooltip above the button with:
  - Full Ukrainian name (e.g., "Радар раннього попередження")
  - Description (e.g., "Показує напрям наближення дронів за 5с")
  - Cost in green
  - Hotkey badge
- Tooltip appears with 200ms delay, slides up with fade-in
- Replace cryptic abbreviations with cleaner short labels where possible
- Button data as a structured array instead of inline JSX spaghetti

### 3. StationPanel with Tooltips & Descriptions (`StationPanel.tsx`)
- Each `PanelBtn` gets a tooltip on hover showing:
  - Full action name
  - What it does (1 line)
  - Cost
- Use a simple `title` attribute for now + a custom tooltip div on hover
- Group buttons more clearly: "Оборона" and "Управління" sections with horizontal rule separator
- Add brief description text under section headers

### 4. Tooltip Component (`ActionBar.tsx` inline)
- Simple CSS-only tooltip: absolute positioned div above button
- Appears on hover after 150ms (CSS transition-delay)
- Glass background matching game-panel style
- Arrow pointing down to button
- Max-width 200px, text-left

### 5. Increase Station Node Label Offset (`StationNode3D.tsx`)
- Move station name labels higher (y offset +1) to avoid overlapping with station geometry
- Reduce label font size slightly for distant stations (based on importance flag)

## File Summary

| File | Changes |
|------|---------|
| `constants.ts` | Spread station coordinates, increase map dimensions |
| `ActionBar.tsx` | Add tooltip system with full names/descriptions for every button |
| `StationPanel.tsx` | Add tooltip descriptions to all panel buttons, cleaner sections |
| `StationNode3D.tsx` | Higher label offset, transfer station markers |

~4 files. Focus: make UI discoverable and spread stations out.

