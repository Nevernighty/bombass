

# Phase 10: Grand UI & Visual Overhaul

## Problems Visible in Screenshot

1. **TopBar is cluttered** — tiny emoji stats crammed together, hard to read, looks like debug info
2. **StationPanel is ugly** — yellow/green borders on buttons look cheap, grid of emoji buttons is confusing, no visual hierarchy
3. **ActionBar is messy** — too many tiny buttons jammed together, section labels barely visible, emoji-only is cryptic
4. **Buildings are gray primitive boxes** — no visual interest, look like placeholder programmer art
5. **Typography is broken** — mixed tiny font sizes (7px, 8px, 10px), no consistent type scale, emoji used as icons everywhere
6. **Station panel buttons have ugly colored borders** — yellow-green rectangles with emojis look like early 2000s web
7. **Camera sidebar buttons look disconnected** — floating blue circles on the right side
8. **3D stations are colored blobs** — not visually interesting, no hover feedback visible
9. **Metro lines are thin and hard to see** in the screenshot
10. **No cohesive design language** — everything looks thrown together

## Approach

Complete visual redesign with a consistent dark glass aesthetic. Replace emoji chaos with clean icons and text. Proper typography scale. Better 3D materials.

### 1. TopBar Redesign (`TopBar.tsx`)
- Clean segmented layout with proper spacing
- Replace emoji spam with icon+value pairs using consistent sizing
- Score: large bold white number. Money: green with coin icon (text, not emoji). Lives: styled heart divs instead of emoji
- Speed buttons: pill-shaped toggle group, not separate rectangles
- Wave indicator: clean badge with subtle animation
- Right stats: icon + number in consistent 11px, spaced with thin dividers
- Remove `flex-wrap` — single row, overflow hidden
- Font: 11px base for stats, 16px for score, 13px for money

### 2. ActionBar Redesign (`ActionBar.tsx`)
- Remove `SectionLabel` text — use thin vertical dividers only
- Buttons: 40x40px squares with clean SVG-style text icons instead of emoji
- Replace emoji icons with short text labels: "M1", "M2", "M3" for train lines, "ПРО" for AA, "РДР" for radar, etc.
- Consistent button style: dark glass background, subtle border, single color accent on hover
- Remove tooltip arrow div (looks broken)
- Cost shown as small superscript number
- Active state: filled background with accent color at 15% opacity
- Hotkey: bottom-right corner, 8px monospace
- Max 12 buttons visible, rest in overflow

### 3. StationPanel Redesign (`StationPanel.tsx`)
- Wider panel (max-w-md) with proper padding
- Header: station name 16px bold, line color dot, close X button
- HP bar: clean rounded bar, 4px height, no text overlay (show HP as text next to bar)
- Passenger count: clean "3/8 пасажирів" text, no emoji
- Buttons: 2-column grid, each button is text label + cost, no emoji
- Button style: dark glass, white text, cost in muted color on right
- Hover: subtle brightness increase, no colored borders
- Remove section emoji labels, use clean uppercase 10px headers
- Defense and Station sections clearly separated

### 4. Camera Controls Redesign (`GameCanvas.tsx`)
- Move camera buttons to bottom-right corner, horizontal row
- Smaller: 32x32px with text labels (F, O, C) instead of emoji
- Remove +/- zoom buttons (scroll works fine)
- Remove home button (Esc resets)
- Clean glass style matching ActionBar

### 5. Buildings Visual Upgrade (`CityBuildings.tsx`)
- Increase building base emissive to show more form in the dark
- Add window grid: 3 rows of small emissive planes per building face (front and side)
- Window color: warm yellow at night (#ffcc66), cool blue during day (#88aacc)
- More height variation: tallest buildings h=10, add a few landmark-sized ones
- Edge highlight: slightly lighter top face color for rooftops
- Building material: increase metalness to 0.3 for subtle reflections

### 6. Ground & Environment (`Scene3D.tsx`)
- Darker ground color: #060a14 to match canvas background
- Remove gridHelper (looks ugly and primitive)
- Add subtle radial gradient on ground (lighter near center where stations are)
- Fog closer: 60-150 range for more atmospheric depth
- Reduce ambient light slightly for more contrast

### 7. Metro Lines (`MetroLine3D.tsx`)
- Increase tube radius: 0.5 → 0.7 for core
- Increase glow tube: 1.0 → 1.5
- Higher emissive at night: 0.8 → 1.2
- Energy pulse larger: 0.6 → 1.0 sphere

### 8. Station 3D (`StationNode3D.tsx`)
- Increase station base size to 2.5 for better clickability
- Add subtle ground shadow circle beneath each station
- Station name text: increase to 0.65 fontSize for readability
- Better material: increase metalness to 0.5, decrease roughness to 0.3 for shinier look
- Platform ring: thicker, more opaque (0.6 → 0.8)

### 9. Start Screen Polish (`GameCanvas.tsx`)
- Title: larger 48px, use Inter/system font not monospace
- Mode cards: cleaner layout, remove emoji icons, use text-only headers
- Difficulty: colored bar (green→yellow→red) instead of star emoji
- Controls hint: cleaner monospace text, better contrast
- Background: pure dark (#060a14) instead of gradient animation (distracting)

### 10. Game Over Screen (`GameCanvas.tsx`)
- Clean stat list (left-aligned labels, right-aligned values)
- Remove emoji from stats
- Cleaner restart button
- Achievement icons: keep but add subtle border

### 11. CSS Cleanup (`index.css`)
- Add consistent type scale variables
- Clean up redundant animations
- Add `.game-stat` utility class for consistent stat display
- Add `.game-panel` for consistent glass panel styling

## File Summary

| File | Key Changes |
|------|------------|
| `TopBar.tsx` | Clean layout, remove emoji, proper typography, segmented design |
| `ActionBar.tsx` | Text icons, 40px buttons, remove section labels, cleaner tooltips |
| `StationPanel.tsx` | 2-col text buttons, no emoji, wider, clean HP bar |
| `GameCanvas.tsx` | Redesign start/end screens, move camera controls, clean floating scores |
| `Scene3D.tsx` | Remove grid, darker ground, tighter fog, less ambient |
| `CityBuildings.tsx` | Multi-row windows, higher emissive, more height variety |
| `MetroLine3D.tsx` | Thicker tubes, bigger glow |
| `StationNode3D.tsx` | Larger size, ground shadow, shinier material |
| `index.css` | Type scale, panel utilities, cleanup |

~9 files. Focus: consistent dark glass aesthetic, proper typography, no emoji spam.

