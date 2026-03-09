

# Multi-City World Map — All Cities Simultaneously

## What the User Wants
Instead of choosing ONE city at the start screen, the player manages **ALL 5 cities at once** on a world/country map. The game is intertwined — you see all cities, get cross-city notifications ("Харків потребує ППО!"), and switch between cities during gameplay. Slower pace overall.

## Architecture

### Current State
- Start screen has a city selector dropdown → picks ONE city → game runs only that city
- `GameState` has `currentCity` (string) and `cityStates` (Record) but only the current city's stations/trains are in state
- All game logic (stations, trains, drones, etc.) operates on a single city

### New Design
- **Remove** city selector from start screen — game always starts with ALL cities
- **World Map overlay** — a mini Ukraine map showing all 5 cities as clickable nodes, always accessible during gameplay
- **Active city** = the one you're currently viewing/managing in 3D. Click a city on the world map to switch
- Each city has its **own independent state** (stations, trains, drones, buildings) running in parallel
- **Cross-city notifications** fire from non-active cities ("⚠️ Харків: Повітряна тривога!", "🏗️ Львів: Станція потребує ремонту")
- **Slower global pace** — station unlocks every 60s (up from 45s), drone raids less frequent initially

## File Changes

### 1. `src/game/types.ts` — Expand CityState
Add per-city game sub-state to `CityState`: stations, trains, drones, buildings, etc. Add `allCityStates: Record<string, CitySubState>` to `GameState`. Add `crossCityNotifications` array.

### 2. `src/game/GameEngine.ts` — Multi-city simulation loop
- `createInitialState()` initializes ALL 5 cities' substates (stations, trains, buildings per city)
- Main `updateGame()` runs a lightweight tick on non-active cities (spawn drones, degrade stations, accumulate passengers) and full tick on active city
- Cross-city notification generator: every 15-30s, check non-active cities for events (low HP station, air raid, overcrowded station) and push notifications with city name + action suggestion
- `switchToCity(state, cityId)` — swaps active city data in/out of main state arrays
- Station unlock interval → 60s, initial raid delay doubled

### 3. `src/game/GameCanvas.tsx` — Remove city selector, add world map
- **Start screen**: Remove the city buttons. All scenarios start with all cities. Default active city = Kyiv
- **World Map component** (new): Floating panel (bottom-left or toggleable) showing a simplified Ukraine outline with 5 city dots. Each dot shows city name, stability %, and alert indicator (pulsing red if under attack). Click to switch active city
- Cross-city notification toasts: "🏭 Харків потребує зенітки!" with a "Перейти" (Go) button that switches city

### 4. `src/game/ui/WorldMap.tsx` — New Component
- Simplified Ukraine silhouette (SVG path or positioned dots)
- 5 city nodes at approximate geographic positions:
  - Kyiv: center
  - Kharkiv: east
  - Dnipro: southeast
  - Lviv: west
  - Odesa: south
- Each node: city icon, nameUa, stability bar, blinking alert dot if events pending
- Active city highlighted with glow
- Click handler calls `onSwitchCity(cityId)`
- Intercity train routes shown as animated dashed lines between connected cities

### 5. `src/game/ui/TopBar.tsx` — Add city name badge + world map toggle
- Show current city name/icon in TopBar
- Small globe/map button to toggle world map overlay

### 6. `src/game/ui/CrossCityAlert.tsx` — New Component
- Toast-style alerts from other cities: icon + city name + event description + "Перейти" button
- Stack up to 3, auto-dismiss after 8s
- Events: air raid started, station destroyed, station overcrowded, building destroyed, stability below 40%

### 7. `src/game/config/scenarios.ts` — Update scenarios
- All scenarios now multi-city by default (no per-city filtering needed)

## Key Mechanics

**Background city simulation** (non-active cities):
- Drones spawn at 50% rate of active city
- Stations auto-defend at 30% effectiveness (encouraging player to switch)
- Passengers accumulate normally
- If stability drops below 30%, urgent cross-city alert fires

**Cross-city notifications** (examples):
- "⚠️ Харків: Повітряна тривога! Зенітки потрібні" → click switches to Kharkiv
- "🔧 Одеса: Станція Дерибасівська зруйнована" → click switches to Odesa  
- "📦 Дніпро: Пасажири переповнені" → click switches to Dnipro
- "🏗️ Львів: Нова станція доступна для підключення"

**Pacing**: Station unlock interval = 60s across all cities (staggered so they don't all unlock simultaneously). Initial 2 minutes = tutorial/calm period.

