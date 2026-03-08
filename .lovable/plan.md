

# Phase 15: Train Scale, Sky Dome, Station Spread & UI Polish

## Problems Visible in Screenshots

1. **Trains are GIANT** — scale `[3.0, 3.0, 3.0]` makes them bigger than buildings. All 3 trains overlap into a massive blob at center. Need scale ~0.8
2. **Ugly cut half-sphere sky dome** — `sphereGeometry args={[150, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]}` creates a visible hemisphere edge in image-22. Must be full sphere or removed entirely
3. **Stations still clustered in center** — all trains converge to same spot because transfer stations are too close. Need to verify and fix station coordinates in constants.ts
4. **Map texture barely visible** — the reference map is dark and lost against the dark ground
5. **ActionBar dropdowns** — functional but could have slightly better contrast

## Changes (~4 files)

### 1. TrainModel.tsx — Shrink trains dramatically
- Scale GLB from `[3.0, 3.0, 3.0]` → `[0.6, 0.6, 0.6]` — these are full-size wagon models, 0.6 is correct for the map scale
- Shrink shadow disc from 3.5 → 1.2
- Shrink glow ring from 2.5-4.0 → 0.8-1.5
- Shrink shield sphere from 4.5 → 2.0
- Shrink hover ring, selection ring proportionally
- Reduce billboard text position from y=4.0 → y=2.5, font size 1.0 → 0.7
- Reduce capacity bar size proportionally
- Reduce headlight distance

### 2. Scene3D.tsx — Fix sky dome & lighting
- Replace half-sphere skybox with a full inverted sphere (`args={[200, 32, 16]}`) — no visible edge
- OR remove the sphere entirely and just use fog + background color
- Increase map texture opacity to 0.6 day / 0.5 night for better Kyiv visibility
- Brighten ground base color slightly

### 3. constants.ts — Verify station spread
- Check that transfer stations (center cluster) have enough separation
- Ensure minimum 0.08 normalized distance between any two stations

### 4. ActionBar.tsx — Minor contrast boost
- Increase bottom bar background opacity to 0.98
- Add subtle inner shadow to dropdown panels

