

# KYIV BOMBASS TRANSIT — Multi-City Overhaul

## Scope

This is a large overhaul touching ~10 files. The core changes: rename the game, add 4 Ukrainian cities with real transit networks, intercity migration, stability goals, building management, tutorial system, and fix station unlock pacing / line flexibility.

## 1. New File: `src/game/config/cities.ts` — City Data

Define all 5 cities with real transit data:

- **Kyiv** (existing): 3 metro lines (M1 Святошинсько-Броварська, M2 Оболонсько-Теремківська, M3 Сирецько-Печерська) — keep current stations
- **Kharkiv**: 3 metro lines (Холодногірсько-Заводська, Салтівська, Олексіївська) with real station names (Історичний музей, Університет, Академіка Барабашова, etc.)
- **Dnipro**: 1 metro line (real stations: Вокзальна, Металургів, Центральна, etc.) — shorter map
- **Lviv**: Tramway system — 8 tram routes (real: №1 Вокзал–Погулянка, №6 Сихів–Центр, etc.) using `tram` transport type
- **Odesa**: Tramway system — 5 tram routes (real: №5 Аркадія–Вокзал, №28 Люстдорф, etc.)

Each city has: `id`, `nameUa`, `type: 'metro' | 'tram'`, `lines[]`, `stations[]`, `riverPoints?`, `mapWidth/Height`, `intercityConnections[]` (links to other cities with travel time and cost).

Export `CITIES` map and `getCityConfig(id)`.

## 2. Update `src/game/constants.ts` — Refactor to Per-City

- Keep Kyiv data as default but wrap in a city structure
- Add `currentCityId` concept
- `STATIONS`, `LINE_STATIONS`, `METRO_LINES` become functions of city: `getStationsForCity(cityId)`, `getLinesForCity(cityId)`
- Tramway cities use same station/line model but with `type: 'tram'` and shorter distances

## 3. Update `src/game/types.ts` — New Types

```typescript
interface CityState {
  cityId: string;
  stability: number; // 0-100%, goal is 50%+
  avgSatisfaction: number;
  buildingsManaged: number;
}

// Add to GameState:
currentCity: string;
cities: Record<string, CityState>;
intercityTrains: IntercityTrain[];
tutorialStep: number;
tutorialComplete: boolean;
buildingUpgrades: Record<number, BuildingUpgrade>;
globalStability: number; // average of all city stabilities
```

`IntercityTrain`: `{ id, fromCity, toCity, progress, passengers, travelTime }`
`BuildingUpgrade`: `{ level, income, repairRate }`

## 4. Update `src/game/GameEngine.ts` — Core Changes

**Station unlock pacing**: Change `STATION_UNLOCK_INTERVAL` from `20000` (20s) to `45000` (45s). Add requirement: player must have delivered at least `N * 10` passengers before wave N stations unlock (gating).

**Flexible line assignment**: Modify `connectStation()` — remove the restriction that pending stations must connect to their original line's end. Allow connecting any pending station to any line's end station. The station adopts the line color of whichever line it connects to. Update `LINE_STATIONS` dynamically.

**Stability system**: New `updateStability()` function — stability = weighted average of: station health (30%), passenger satisfaction (30%), buildings intact (20%), power grid (20%). Target 50%+. Below 50% triggers penalties (slower income, morale drop notifications). Above 80% gives bonuses.

**Building management**: Extend `BuildingState` with `level`, `income`, `type` ('residential' | 'commercial' | 'industrial'). Add `upgradeBuilding(idx)` action — costs money, increases income and HP. Buildings generate passive income based on level.

**Intercity system**: New `updateIntercity()` — intercity trains travel between cities over 60s. Arriving passengers boost destination city score. Player can dispatch intercity train for cost. Switching cities preserves state.

**Tutorial system**: `tutorialStep` tracks progress (0 = not started). Steps:
1. "Welcome" — explain goal
2. "Click a station" — wait for station click
3. "Buy a train" — wait for purchase
4. "Connect a station" — wait for connection
5. "Build defense" — wait for anti-air
6. "Survive a raid" — complete
Each step shows a focused overlay with arrow pointing to relevant UI element.

## 5. Update `src/game/GameCanvas.tsx` — City Selector + Tutorial

**Start screen**: 
- Title: "KYIV BOMBASS TRANSIT" with gradient
- Add city selector dropdown above scenario cards — shows 5 cities with icons (🏙️ Київ, 🏭 Харків, ⛏️ Дніпро, 🦁 Львів, ⚓ Одеса)
- Selected city shows its lines/description
- Tramway cities show tram icon instead of metro

**Tutorial overlay**: Conditional rendering based on `tutorialStep`. Semi-transparent overlay with spotlight on target element and instruction text. "Далі" / "Пропустити" buttons.

**City switcher in-game**: Small dropdown in TopBar to switch between unlocked cities (unlocked by reaching score thresholds).

**Stability indicator**: Show in TopBar — colored bar (red < 50%, yellow 50-80%, green > 80%).

## 6. Update `src/game/ui/TopBar.tsx` — Stability + City

- Add stability meter (colored progress bar)
- Add current city name badge
- Add city switcher button (dropdown)
- Rename game title display

## 7. Update `src/game/ui/ActionBar.tsx` — Building Management

- Add "БУДІВЛІ" (Buildings) section with:
  - Upgrade building button (when building selected)
  - Building income display
- Add "МІЖМІСЬКЕ" (Intercity) section with:
  - Send intercity train button (cost: 100💰)

## 8. Update `src/game/ui/StationPanel.tsx` — Line Flexibility

- When connecting pending stations, show ALL lines as options, not just the station's original line
- Add visual indicator of which line a station belongs to (can be reassigned)

## 9. Update `index.html` — Rename

- Title: "KYIV BOMBASS TRANSIT"
- Meta descriptions updated

## 10. Update `src/game/config/scenarios.ts`

- Add city-specific scenarios (e.g., "Харків: Оборона метро", "Львів: Трамвайний хаос")
- Existing Kyiv scenarios preserved

## Key Design Decisions

- Cities share the same `GameState` structure — city switch swaps the active station/line data
- Tramway cities reuse metro rendering but with different colors and surface-level tracks
- Drones (shaheds) are universal across all cities — same models
- Station unlock gating: `passengersDelivered >= stationsUnlocked * 10` before next unlock
- Line flexibility: any pending station can join any line from any end station
- Stability below 50% for 60s = game over warning; below 30% = life loss

