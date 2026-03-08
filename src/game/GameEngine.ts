import { STATIONS, STATION_MAP, LINE_STATIONS, GAME_CONFIG, SURFACE_ROUTES, PassengerShape, DRONE_TYPES } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, RepairUnit, DroneType, GameNotification } from './types';
import { AudioEngine } from './AudioEngine';
import { EventBus } from './core/EventBus';
import { getCurrentWave, getCurrentWaveIndex, PATIENCE_BASE, PATIENCE_MIN, PATIENCE_DECAY_PER_WAVE } from './config/difficulty';

let nextId = 0;
const uid = () => `${++nextId}`;

// O(1) index into state.stations array by station ID
const STATION_IDX = new Map<string, number>(STATIONS.map((s, i) => [s.id, i]));
export function getStation(state: GameState, id: string) {
  const idx = STATION_IDX.get(id);
  return idx !== undefined ? state.stations[idx] : undefined;
}

const SHAPES: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
const STARTING_STATIONS = ['r10', 'r11', 'b7', 'b8', 'g4', 'g5'];

const UNLOCK_ORDER: Record<string, string[]> = {
  red: ['r9', 'r12', 'r8', 'r13', 'r7', 'r14', 'r6', 'r15', 'r5', 'r16', 'r4', 'r17', 'r3', 'r18', 'r2', 'r1'],
  blue: ['b6', 'b9', 'b5', 'b10', 'b4', 'b11', 'b3', 'b12', 'b2', 'b13', 'b1', 'b14', 'b15', 'b16'],
  green: ['g3', 'g6', 'g2', 'g7', 'g1', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15'],
};

const STATION_UNLOCK_INTERVAL = 20000;

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function assignStationShape(station: typeof STATIONS[0], index: number): PassengerShape {
  if (station.isTransfer) return 'star';
  const lineShapes: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond'];
  return lineShapes[index % lineShapes.length];
}

export function createInitialState(): GameState {
  let stationIndex = 0;
  const stations: GameStation[] = STATIONS.map(s => ({
    ...s,
    isTransfer: s.isTransfer || false,
    shape: assignStationShape(s, stationIndex++),
    passengers: [],
    hp: 100, maxHp: 100,
    maxPassengers: GAME_CONFIG.MAX_PASSENGERS_PER_STATION,
    isDestroyed: false, isOnFire: false, fireTimer: 0,
    isRepairing: false, repairProgress: 0,
    jellyOffset: { x: 0, y: 0 }, jellyVel: { x: 0, y: 0 },
    isOpen: true, shelterCount: 0, hasAntiAir: false, shieldTimer: 0, level: 1,
  }));

  const trains: Train[] = [];
  (['red', 'blue', 'green'] as const).forEach(line => {
    const lineStartStations = STARTING_STATIONS.filter(id => id.startsWith(line[0]));
    if (lineStartStations.length < 2) return;
    const st = STATION_MAP.get(lineStartStations[0])!;
    trains.push({
      id: uid(), line, routeIndex: 0, progress: 0, direction: 1,
      speed: GAME_CONFIG.TRAIN_SPEED, passengers: [], capacity: GAME_CONFIG.TRAIN_CAPACITY,
      x: st.x, y: st.y, dwellTimer: 0, isDwelling: false, level: 1,
    });
  });

  return {
    stations, trains, drones: [], surfaceVehicles: [], explosions: [], repairUnits: [],
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, targetX: 0, targetY: 0 },
    score: 0, lives: 3, combo: 1, maxCombo: 1, money: 50,
    passengersDelivered: 0, passengersAbandoned: 0,
    dronesIntercepted: 0, totalDrones: 0,
    stationsDestroyed: 0, stationsRepaired: 0,
    networkEfficiency: 100, peakLoad: 0,
    dayTime: 0.25, isNight: false,
    isAirRaid: false, airRaidTimer: 0, raidDronesSpawned: 0,
    nextRaidTime: GAME_CONFIG.AIR_RAID_MIN_INTERVAL + Math.random() * (GAME_CONFIG.AIR_RAID_MAX_INTERVAL - GAME_CONFIG.AIR_RAID_MIN_INTERVAL),
    screenShake: 0, gameOver: false, gameStarted: false, isPaused: false,
    elapsedTime: 0, speedMultiplier: 1, unlockedRoutes: [],
    selectedTrain: null, hoveredStation: null,
    activeStationIds: [...STARTING_STATIONS],
    nextStationUnlockTime: STATION_UNLOCK_INTERVAL,
    qteActive: false, qteDroneId: null, qteKey: 'Q', qteTimer: 0,
    notifications: [], waveIndex: 0,
    _cachedLineStations: {},
  };
}

export function getActiveLineStations(state: GameState, line: string): string[] {
  // Use cache if available
  if (state._cachedLineStations[line]) return state._cachedLineStations[line];
  const lineIds = LINE_STATIONS[line];
  if (!lineIds) return [];
  const activeSet = new Set(state.activeStationIds);
  return lineIds.filter(id => activeSet.has(id));
}

function addNotification(state: GameState, text: string, x: number, y: number, color = '#fff') {
  if (state.notifications.length < 30) {
    state.notifications.push({ id: uid(), text, x, y, timer: 2000, color });
  }
}

// ==================== SYSTEM: Passengers ====================
function updatePassengers(s: GameState, realDt: number, events: EventBus): void {
  const wave = getCurrentWave(s.elapsedTime);
  const activeSet = new Set(s.activeStationIds);

  // Available shapes from active non-destroyed stations
  const activeShapes = new Set<PassengerShape>();
  for (const st of s.stations) {
    if (activeSet.has(st.id) && !st.isDestroyed) activeShapes.add(st.shape);
  }
  const availableShapes = Array.from(activeShapes);

  // Spawn
  if (Math.random() < realDt / wave.passengerSpawnRate && availableShapes.length > 1) {
    const openStations = s.stations.filter(st =>
      activeSet.has(st.id) && st.isOpen && !st.isDestroyed && st.passengers.length < st.maxPassengers
    );
    if (openStations.length > 0) {
      const station = openStations[Math.floor(Math.random() * openStations.length)];
      const possibleShapes = availableShapes.filter(sh => sh !== station.shape);
      if (possibleShapes.length > 0) {
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        const patienceMs = Math.max(PATIENCE_MIN, PATIENCE_BASE - s.waveIndex * PATIENCE_DECAY_PER_WAVE);
        station.passengers.push({ id: uid(), shape, spawnTime: s.elapsedTime, stationId: station.id, patience: patienceMs });
        station.jellyVel.y = -2;
      }
    }
  }

  // Patience decay — passengers leave if they wait too long
  for (const station of s.stations) {
    if (!activeSet.has(station.id) || station.isDestroyed) continue;
    for (let i = station.passengers.length - 1; i >= 0; i--) {
      station.passengers[i].patience -= realDt;
      if (station.passengers[i].patience <= 0) {
        station.passengers.splice(i, 1);
        s.passengersAbandoned++;
        s.combo = Math.max(1, Math.round((s.combo - 0.3) * 10) / 10);
        events.emit({ type: 'PASSENGER_ABANDONED', x: station.x, y: station.y });
        addNotification(s, '😤', station.x, station.y, '#e74c3c');
      }
    }
  }

  // Station overflow
  let totalPassengers = 0;
  for (const station of s.stations) {
    if (!activeSet.has(station.id)) continue;
    totalPassengers += station.passengers.length;
    if (station.passengers.length >= station.maxPassengers && !station.isDestroyed) {
      s.combo = 1;
      if (station.passengers.length > station.maxPassengers + 2) {
        s.lives--;
        station.passengers.splice(0, 3);
        station.jellyVel.x = 5; station.jellyVel.y = 5;
        events.emit({ type: 'STATION_OVERFLOW', x: station.x, y: station.y });
        if (s.lives <= 0) s.gameOver = true;
      }
    }
  }
  s.peakLoad = Math.max(s.peakLoad, totalPassengers);
}

// ==================== SYSTEM: Trains ====================
function updateTrains(s: GameState, realDt: number, events: EventBus): void {
  s.trains = s.trains.map(train => {
    const t = { ...train };
    const route = getActiveLineStations(s, t.line);
    if (!route || route.length < 2) return t;

    t.routeIndex = Math.max(0, Math.min(route.length - 1, t.routeIndex));

    if (t.isDwelling) {
      t.dwellTimer -= realDt;
      if (t.dwellTimer <= 0) {
        t.isDwelling = false;
        t.progress = 0;
        const peekNext = t.routeIndex + t.direction;
        if (peekNext >= route.length || peekNext < 0) {
          t.direction = (t.direction * -1) as 1 | -1;
        }
      }
      const curStData = STATION_MAP.get(route[t.routeIndex]);
      if (curStData) { t.x = curStData.x; t.y = curStData.y; }
      return t;
    }

    const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
    if (nextIdx === t.routeIndex) {
      t.direction = (t.direction * -1) as 1 | -1;
      t.isDwelling = true;
      t.dwellTimer = GAME_CONFIG.DWELL_TIME;
      const curStData2 = STATION_MAP.get(route[t.routeIndex]);
      if (curStData2) { t.x = curStData2.x; t.y = curStData2.y; }
      return t;
    }

    t.progress += (t.speed * realDt) / 2500;

    const curStConst = STATION_MAP.get(route[t.routeIndex]);
    const nextStConst = STATION_MAP.get(route[nextIdx]);
    if (curStConst && nextStConst) {
      const eased = easeInOutQuad(Math.min(t.progress, 1));
      t.x = curStConst.x + (nextStConst.x - curStConst.x) * eased;
      t.y = curStConst.y + (nextStConst.y - curStConst.y) * eased;
    }

    if (t.progress >= 1) {
      t.routeIndex = nextIdx;
      t.progress = 0;
      t.isDwelling = true;
      t.dwellTimer = GAME_CONFIG.DWELL_TIME;

      const arrStation = getStation(s, route[t.routeIndex]);
      if (arrStation) {
        t.x = arrStation.x; t.y = arrStation.y;

        if (!arrStation.isDestroyed) {
          // Unload matching passengers
          const matching = t.passengers.filter(p => p.shape === arrStation.shape);
          if (matching.length > 0) {
            const earned = Math.round(matching.length * s.combo);
            s.score += earned;
            s.money += Math.round(earned * 0.5);
            s.passengersDelivered += matching.length;
            s.combo = Math.min(Math.round((s.combo + 0.2) * 10) / 10, 5);
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            t.passengers = t.passengers.filter(p => p.shape !== arrStation.shape);
            addNotification(s, `+${earned}`, arrStation.x, arrStation.y, '#2ecc71');
            events.emit({ type: 'PASSENGER_DELIVERED', x: arrStation.x, y: arrStation.y, data: { count: matching.length } });
          }

          // Transfer logic: at transfer stations, unload passengers whose
          // destination shape doesn't exist on current line but does on another active line
          if (arrStation.isTransfer) {
            const currentLineShapes = new Set<PassengerShape>();
            const activeSet = new Set(s.activeStationIds);
            for (const sid of (s._cachedLineStations[t.line] || [])) {
              const st = getStation(s, sid);
              if (st && !st.isDestroyed && activeSet.has(st.id)) currentLineShapes.add(st.shape);
            }
            const transferPassengers = t.passengers.filter(p => !currentLineShapes.has(p.shape));
            if (transferPassengers.length > 0) {
              const spaceAtStation = arrStation.maxPassengers - arrStation.passengers.length;
              const toTransfer = transferPassengers.slice(0, spaceAtStation);
              toTransfer.forEach(p => {
                arrStation.passengers.push({ ...p, stationId: arrStation.id });
              });
              const transferIds = new Set(toTransfer.map(p => p.id));
              t.passengers = t.passengers.filter(p => !transferIds.has(p.id));
              if (toTransfer.length > 0) {
                addNotification(s, `🔄 ${toTransfer.length}`, arrStation.x, arrStation.y, '#a29bfe');
              }
            }
          }

          // Load
          const space = t.capacity - t.passengers.length;
          if (space > 0 && arrStation.passengers.length > 0) {
            const pickup = arrStation.passengers.splice(0, space);
            t.passengers.push(...pickup);
          }
          arrStation.jellyVel.y = -1.5;
          events.emit({ type: 'TRAIN_ARRIVE', x: arrStation.x, y: arrStation.y });
        }
      }
    }
    return t;
  });
}

// ==================== SYSTEM: Drones ====================
function updateDrones(s: GameState, realDt: number, events: EventBus): void {
  s.drones = s.drones.filter(d => {
    if (d.isDestroyed) return false;
    const target = getStation(s, d.targetStationId);
    if (!target) return false;

    // Anti-air intercept
    if (target.hasAntiAir && target.shieldTimer <= 0) {
      const dx = target.x - d.x, dy = target.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.06) {
        d.hp--;
        if (d.hp <= 0) {
          d.isDestroyed = true;
          s.dronesIntercepted++;
          s.score += 15;
          s.money += 10;
          s.explosions.push({ x: d.x, y: d.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
          addNotification(s, 'ПРО збив!', d.x, d.y, '#3498db');
          events.emit({ type: 'DRONE_DESTROYED', x: d.x, y: d.y });
          return false;
        }
      }
    }

    // Shield block
    if (target.shieldTimer > 0) {
      const dx = target.x - d.x, dy = target.y - d.y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.03) {
        d.isDestroyed = true;
        s.dronesIntercepted++;
        s.explosions.push({ x: d.x, y: d.y, radius: 0, maxRadius: 20, alpha: 1, time: 0 });
        events.emit({ type: 'SHIELD_BLOCK', x: d.x, y: d.y });
        return false;
      }
    }

    const dx = target.x - d.x, dy = target.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    d.angle = Math.atan2(dy, dx);
    d.wobble += realDt * 0.005;

    // Hit station
    if (dist < 0.015) {
      const config = DRONE_TYPES[d.droneType];
      target.hp -= config.damage;
      target.isOnFire = true;
      target.fireTimer = 5000;
      target.jellyVel.x = 8; target.jellyVel.y = 8;
      s.screenShake = 10;
      s.explosions.push({ x: target.x, y: target.y, radius: 0, maxRadius: 40, alpha: 1, time: 0 });
      addNotification(s, `💥 -${config.damage}HP`, target.x, target.y, '#e74c3c');
      events.emit({ type: 'DRONE_HIT_STATION', x: target.x, y: target.y, data: { damage: config.damage } });
      if (target.hp <= 0) {
        target.isDestroyed = true;
        target.isOpen = false;
        s.stationsDestroyed++;
        s.lives--;
        events.emit({ type: 'STATION_DESTROYED', x: target.x, y: target.y });
        if (s.lives <= 0) s.gameOver = true;
      }
      return false;
    }

    const moveSpeed = d.speed * realDt / 1000;
    d.x += (dx / dist) * moveSpeed * 0.03;
    d.y += (dy / dist) * moveSpeed * 0.03;
    return true;
  });
}

// ==================== SYSTEM: Crisis (Air Raids) ====================
function updateCrisis(s: GameState, realDt: number, events: EventBus): void {
  const wave = getCurrentWave(s.elapsedTime);
  const newWaveIdx = getCurrentWaveIndex(s.elapsedTime);
  if (newWaveIdx > s.waveIndex) {
    s.waveIndex = newWaveIdx;
    addNotification(s, `⚠ ХВИЛЯ ${newWaveIdx + 1}`, 0.5, 0.5, '#eab308');
    events.emit({ type: 'WAVE_ADVANCE', data: { wave: newWaveIdx } });
  }

  if (!s.isAirRaid) {
    if (s.elapsedTime > s.nextRaidTime) {
      s.isAirRaid = true;
      s.airRaidTimer = 0;
      s.raidDronesSpawned = 0;
      events.emit({ type: 'AIR_RAID_START' });
      s.surfaceVehicles.forEach(v => { v.isFrozen = true; });
    }
  } else {
    s.airRaidTimer += realDt;

    // Spawn drones with wave limits
    if (s.raidDronesSpawned < wave.maxDronesPerRaid && Math.random() < realDt / wave.droneSpawnRate) {
      const activeSet = new Set(s.activeStationIds);
      const activeStations = s.stations.filter(st => !st.isDestroyed && activeSet.has(st.id));
      const targetStation = activeStations[Math.floor(Math.random() * activeStations.length)];
      if (targetStation) {
        const edge = Math.random();
        let dx = 0, dy = 0;
        if (edge < 0.25) { dx = -0.05; dy = Math.random(); }
        else if (edge < 0.5) { dx = 1.05; dy = Math.random(); }
        else if (edge < 0.75) { dx = Math.random(); dy = -0.05; }
        else { dx = Math.random(); dy = 1.05; }

        const droneType = wave.droneTypes[Math.floor(Math.random() * wave.droneTypes.length)];
        const config = DRONE_TYPES[droneType];
        s.drones.push({
          id: uid(), x: dx, y: dy,
          targetStationId: targetStation.id,
          speed: config.speed, angle: 0, isDestroyed: false,
          wobble: Math.random() * Math.PI * 2,
          droneType, hp: config.hp, maxHp: config.hp,
        });
        s.totalDrones++;
        s.raidDronesSpawned++;
      }
    }

    if (s.airRaidTimer > wave.raidDuration) {
      s.isAirRaid = false;
      s.nextRaidTime = s.elapsedTime + wave.calmMin + Math.random() * (wave.calmMax - wave.calmMin);
      s.drones = s.drones.filter(d => !d.isDestroyed);
      events.emit({ type: 'AIR_RAID_END' });
      s.surfaceVehicles.forEach(v => { v.isFrozen = false; });
    }
  }
}

// ==================== SYSTEM: Repair ====================
function updateRepair(s: GameState, realDt: number, events: EventBus): void {
  s.repairUnits = s.repairUnits.filter(r => {
    const target = getStation(s, r.targetStationId);
    if (!target) return false;
    const dx = target.x - r.x, dy = target.y - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.02) {
      r.progress += realDt / GAME_CONFIG.REPAIR_TIME;
      if (r.progress >= 1) {
        target.hp = target.maxHp;
        target.isDestroyed = false;
        target.isOnFire = false;
        target.isOpen = true;
        target.isRepairing = false;
        s.stationsRepaired++;
        addNotification(s, '🔧 Відремонтовано!', target.x, target.y, '#3498db');
        events.emit({ type: 'STATION_REPAIRED', x: target.x, y: target.y });
        return false;
      }
      target.isRepairing = true;
      target.repairProgress = r.progress;
      return true;
    }
    const moveSpeed = r.speed * realDt / 1000;
    r.x += (dx / dist) * moveSpeed * 0.04;
    r.y += (dy / dist) * moveSpeed * 0.04;
    return true;
  });
}

// ==================== SYSTEM: Progression ====================
function updateProgression(s: GameState, realDt: number, events: EventBus): void {
  if (s.elapsedTime >= s.nextStationUnlockTime) {
    s.nextStationUnlockTime += STATION_UNLOCK_INTERVAL;
    (['red', 'blue', 'green'] as const).forEach(line => {
      const order = UNLOCK_ORDER[line];
      const nextStation = order.find(id => !s.activeStationIds.includes(id));
      if (nextStation) {
        s.activeStationIds.push(nextStation);
        const st = getStation(s, nextStation);
        if (st) { st.jellyVel.y = -4; st.jellyVel.x = 2; }
        events.emit({ type: 'STATION_UNLOCKED', data: { stationId: nextStation } });
      }
    });
  }
}

// ==================== SYSTEM: Physics / Misc ====================
function updatePhysics(s: GameState, realDt: number): void {
  // Shield timers
  for (const st of s.stations) {
    if (st.shieldTimer > 0) st.shieldTimer -= realDt;
  }

  // Fire/jelly physics
  for (const station of s.stations) {
    if (station.isOnFire) {
      station.fireTimer -= realDt;
      if (station.fireTimer <= 0) station.isOnFire = false;
    }
    const springK = 0.15, damping = 0.85;
    station.jellyVel.x += -station.jellyOffset.x * springK;
    station.jellyVel.y += -station.jellyOffset.y * springK;
    station.jellyVel.x *= damping;
    station.jellyVel.y *= damping;
    station.jellyOffset.x += station.jellyVel.x;
    station.jellyOffset.y += station.jellyVel.y;
  }

  // Notifications
  s.notifications = s.notifications.filter(n => {
    n.timer -= realDt;
    n.y -= realDt * 0.00002;
    return n.timer > 0;
  });

  s.screenShake *= 0.9;
  if (s.screenShake < 0.5) s.screenShake = 0;

  // Explosions
  s.explosions = s.explosions.filter(e => {
    e.time += realDt;
    e.radius = e.maxRadius * Math.min(1, e.time / 500);
    e.alpha = Math.max(0, 1 - e.time / 1000);
    return e.alpha > 0;
  });

  // QTE
  if (s.qteActive) {
    s.qteTimer -= realDt;
    if (s.qteTimer <= 0) { s.qteActive = false; s.qteDroneId = null; }
  }
  if (!s.qteActive && s.drones.some(d => !d.isDestroyed) && Math.random() < realDt / 3000) {
    const activeDrones = s.drones.filter(d => !d.isDestroyed);
    const drone = activeDrones[Math.floor(Math.random() * activeDrones.length)];
    if (drone) {
      const config = DRONE_TYPES[drone.droneType];
      s.qteActive = true;
      s.qteDroneId = drone.id;
      s.qteKey = config.qteKeys[Math.floor(Math.random() * config.qteKeys.length)];
      s.qteTimer = config.qteTime;
    }
  }

  // Surface vehicles
  SURFACE_ROUTES.forEach(route => {
    if (s.score >= route.unlockScore && !s.unlockedRoutes.includes(route.id)) {
      s.unlockedRoutes.push(route.id);
      s.surfaceVehicles.push({
        id: uid(), routeId: route.id, type: route.type,
        stopIndex: 0, progress: 0, direction: 1,
        x: route.stops[0].x, y: route.stops[0].y,
        passengers: [], isFrozen: false,
      });
    }
  });
  for (const v of s.surfaceVehicles) {
    if (v.isFrozen) continue;
    const route = SURFACE_ROUTES.find(r => r.id === v.routeId);
    if (!route) continue;
    v.progress += s.speedMultiplier * 16.67 / 3000;
    if (v.progress >= 1) {
      v.progress = 0;
      const nextIdx = v.stopIndex + v.direction;
      if (nextIdx >= route.stops.length - 1 || nextIdx <= 0) v.direction = (v.direction * -1) as 1 | -1;
      v.stopIndex = Math.max(0, Math.min(route.stops.length - 1, v.stopIndex + v.direction));
      if (v.passengers.length > 0) {
        s.score += v.passengers.length;
        s.passengersDelivered += v.passengers.length;
        v.passengers = [];
      }
    }
    const curStop = route.stops[v.stopIndex];
    const ni = Math.max(0, Math.min(route.stops.length - 1, v.stopIndex + v.direction));
    const nextStop = route.stops[ni];
    v.x = curStop.x + (nextStop.x - curStop.x) * v.progress;
    v.y = curStop.y + (nextStop.y - curStop.y) * v.progress;
  }

  // Network efficiency
  const totalCap = s.trains.reduce((sum, t) => sum + t.capacity, 0);
  const totalUsed = s.trains.reduce((sum, t) => sum + t.passengers.length, 0);
  s.networkEfficiency = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
}

// ==================== MAIN UPDATE (orchestrator) ====================
// Global event bus singleton
export const globalEventBus = new EventBus();

export function updateGame(state: GameState, dt: number, audio: AudioEngine): GameState {
  if (!state.gameStarted || state.gameOver || state.isPaused) return state;

  const realDt = dt * state.speedMultiplier;
  const s = { ...state };
  s.elapsedTime += realDt;

  // Day/night
  s.dayTime = (s.dayTime + realDt / GAME_CONFIG.DAY_CYCLE_DURATION) % 1;
  s.isNight = s.dayTime < 0.2 || s.dayTime > 0.8;

  // Cache line stations for this tick
  const activeSet = new Set(s.activeStationIds);
  s._cachedLineStations = {
    red: LINE_STATIONS.red.filter(id => activeSet.has(id)),
    blue: LINE_STATIONS.blue.filter(id => activeSet.has(id)),
    green: LINE_STATIONS.green.filter(id => activeSet.has(id)),
  };

  // Run systems
  updateProgression(s, realDt, globalEventBus);
  updatePassengers(s, realDt, globalEventBus);
  updateTrains(s, realDt, globalEventBus);
  updateCrisis(s, realDt, globalEventBus);
  updateDrones(s, realDt, globalEventBus);
  updateRepair(s, realDt, globalEventBus);
  updatePhysics(s, realDt);

  // Flush events so audio feedback processes them
  globalEventBus.flush();

  return s;
}

// ===== QTE Input =====
export function handleQteInput(state: GameState, key: string, audio: AudioEngine): GameState {
  if (!state.qteActive) return state;
  if (key.toUpperCase() === state.qteKey) {
    const drone = state.drones.find(d => d.id === state.qteDroneId);
    if (drone) {
      drone.hp--;
      if (drone.hp <= 0) {
        drone.isDestroyed = true;
        state.dronesIntercepted++;
        state.score += Math.round(10 * state.combo);
        state.money += 15;
        state.explosions.push({ x: drone.x, y: drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
        addNotification(state, `🎯 +${Math.round(10 * state.combo)}`, drone.x, drone.y, '#f1c40f');
        globalEventBus.emit({ type: 'QTE_SUCCESS', x: drone.x, y: drone.y });
      } else {
        addNotification(state, `💥 ${drone.hp}/${drone.maxHp} HP`, drone.x, drone.y, '#e67e22');
      }
    }
    state.qteActive = false;
    state.qteDroneId = null;
  }
  globalEventBus.flush();
  return state;
}

// ===== Action Functions =====
export function dispatchRepair(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || (!station.isDestroyed && !station.isOnFire)) return state;
  if (state.repairUnits.some(r => r.targetStationId === stationId)) return state;
  state.repairUnits.push({ id: uid(), x: 0.02, y: 0.95, targetStationId: stationId, progress: 0, speed: 1.5 });
  return state;
}

export function reverseTrain(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (train) train.direction = (train.direction * -1) as 1 | -1;
  return state;
}

export function purchaseTrain(state: GameState, line: 'red' | 'blue' | 'green'): GameState {
  if (state.money < GAME_CONFIG.TRAIN_COST) return state;
  const route = getActiveLineStations(state, line);
  if (route.length < 2) return state;
  const startStation = getStation(state, route[0]);
  if (!startStation) return state;
  state.money -= GAME_CONFIG.TRAIN_COST;
  state.trains.push({
    id: uid(), line, routeIndex: 0, progress: 0, direction: 1,
    speed: GAME_CONFIG.TRAIN_SPEED, passengers: [], capacity: GAME_CONFIG.TRAIN_CAPACITY,
    x: startStation.x, y: startStation.y, dwellTimer: 0, isDwelling: false, level: 1,
  });
  return state;
}

export function toggleStationOpen(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (station && !station.isDestroyed) station.isOpen = !station.isOpen;
  return state;
}

export function upgradeTrainCapacity(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (!train || train.level >= 3) return state;
  const cost = GAME_CONFIG.UPGRADE_COST * train.level;
  if (state.money < cost) return state;
  state.money -= cost;
  train.level++;
  train.capacity = GAME_CONFIG.TRAIN_CAPACITY + (train.level - 1) * 3;
  return state;
}

export function deployAntiAir(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.hasAntiAir || state.money < GAME_CONFIG.ANTI_AIR_COST) return state;
  state.money -= GAME_CONFIG.ANTI_AIR_COST;
  station.hasAntiAir = true;
  return state;
}

export function activateShield(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.shieldTimer > 0 || state.money < GAME_CONFIG.SHIELD_COST) return state;
  state.money -= GAME_CONFIG.SHIELD_COST;
  station.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
  return state;
}

export function setSpeedMultiplier(state: GameState, multiplier: number): GameState {
  state.speedMultiplier = Math.max(1, Math.min(10, multiplier));
  return state;
}

export function rerouteTrain(state: GameState, trainId: string, newLine: 'red' | 'blue' | 'green'): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (!train || train.line === newLine) return state;
  const route = getActiveLineStations(state, newLine);
  if (route.length < 2) return state;
  const startStation = getStation(state, route[0]);
  if (!startStation) return state;
  train.line = newLine;
  train.routeIndex = 0; train.progress = 0;
  train.x = startStation.x; train.y = startStation.y;
  train.isDwelling = false;
  return state;
}

export function evacuateStation(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.passengers.length === 0) return state;
  const sameLineStations = state.stations.filter(s =>
    s.line === station.line && s.id !== stationId &&
    state.activeStationIds.includes(s.id) && !s.isDestroyed && s.isOpen
  );
  station.passengers.forEach((p, i) => {
    if (sameLineStations.length > 0) {
      const target = sameLineStations[i % sameLineStations.length];
      if (target.passengers.length < target.maxPassengers) {
        target.passengers.push({ ...p, stationId: target.id });
      }
    }
  });
  station.passengers = [];
  station.jellyVel.x = 3; station.jellyVel.y = -3;
  return state;
}

export function callReinforcements(state: GameState): GameState {
  if (state.money < GAME_CONFIG.REINFORCEMENT_COST) return state;
  state.money -= GAME_CONFIG.REINFORCEMENT_COST;
  const damaged = state.stations.filter(s =>
    (s.isDestroyed || s.isOnFire) && !state.repairUnits.some(r => r.targetStationId === s.id)
  );
  damaged.forEach(station => {
    state.repairUnits.push({ id: uid(), x: 0.02, y: 0.95, targetStationId: station.id, progress: 0, speed: 2.0 });
  });
  return state;
}

export function upgradeStation(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.level >= 3) return state;
  const cost = GAME_CONFIG.UPGRADE_COST * station.level;
  if (state.money < cost) return state;
  state.money -= cost;
  station.level++;
  station.maxHp = 100 + (station.level - 1) * 50;
  station.maxPassengers = GAME_CONFIG.MAX_PASSENGERS_PER_STATION + (station.level - 1) * 4;
  station.hp = station.maxHp;
  return state;
}
