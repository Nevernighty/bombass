import { STATIONS, STATION_MAP, LINE_STATIONS, GAME_CONFIG, SURFACE_ROUTES, PassengerShape, DRONE_TYPES } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, RepairUnit, DroneType, GameNotification } from './types';
import { AudioEngine } from './AudioEngine';

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
    hp: 100,
    maxHp: 100,
    maxPassengers: GAME_CONFIG.MAX_PASSENGERS_PER_STATION,
    isDestroyed: false,
    isOnFire: false,
    fireTimer: 0,
    isRepairing: false,
    repairProgress: 0,
    jellyOffset: { x: 0, y: 0 },
    jellyVel: { x: 0, y: 0 },
    isOpen: true,
    shelterCount: 0,
    hasAntiAir: false,
    shieldTimer: 0,
    level: 1,
  }));

  const trains: Train[] = [];
  (['red', 'blue', 'green'] as const).forEach(line => {
    const lineStartStations = STARTING_STATIONS.filter(id => id.startsWith(line[0]));
    if (lineStartStations.length < 2) return;
    const st = STATION_MAP.get(lineStartStations[0])!;
    trains.push({
      id: uid(),
      line,
      routeIndex: 0,
      progress: 0,
      direction: 1,
      speed: GAME_CONFIG.TRAIN_SPEED,
      passengers: [],
      capacity: GAME_CONFIG.TRAIN_CAPACITY,
      x: st.x,
      y: st.y,
      dwellTimer: 0,
      isDwelling: false,
      level: 1,
    });
  });

  return {
    stations,
    trains,
    drones: [],
    surfaceVehicles: [],
    explosions: [],
    repairUnits: [],
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, targetX: 0, targetY: 0 },
    score: 0,
    lives: 3,
    combo: 1,
    maxCombo: 1,
    money: 0,
    passengersDelivered: 0,
    dronesIntercepted: 0,
    totalDrones: 0,
    stationsDestroyed: 0,
    stationsRepaired: 0,
    networkEfficiency: 100,
    peakLoad: 0,
    dayTime: 0.25,
    isNight: false,
    isAirRaid: false,
    airRaidTimer: 0,
    nextRaidTime: GAME_CONFIG.AIR_RAID_MIN_INTERVAL + Math.random() * (GAME_CONFIG.AIR_RAID_MAX_INTERVAL - GAME_CONFIG.AIR_RAID_MIN_INTERVAL),
    screenShake: 0,
    gameOver: false,
    gameStarted: false,
    isPaused: false,
    elapsedTime: 0,
    speedMultiplier: 1,
    unlockedRoutes: [],
    selectedTrain: null,
    hoveredStation: null,
    activeStationIds: [...STARTING_STATIONS],
    nextStationUnlockTime: STATION_UNLOCK_INTERVAL,
    qteActive: false,
    qteDroneId: null,
    qteKey: 'Q',
    qteTimer: 0,
    notifications: [],
  };
}

export function getActiveLineStations(state: GameState, line: string): string[] {
  const lineIds = LINE_STATIONS[line];
  if (!lineIds) return [];
  return lineIds.filter(id => state.activeStationIds.includes(id));
}

function addNotification(state: GameState, text: string, x: number, y: number, color = '#fff') {
  state.notifications.push({ id: uid(), text, x, y, timer: 2000, color });
}

export function updateGame(state: GameState, dt: number, audio: AudioEngine): GameState {
  if (!state.gameStarted || state.gameOver || state.isPaused) return state;

  const realDt = dt * state.speedMultiplier;
  const s = { ...state };
  s.elapsedTime += realDt;

  // Day/night cycle
  s.dayTime = (s.dayTime + realDt / GAME_CONFIG.DAY_CYCLE_DURATION) % 1;
  s.isNight = s.dayTime < 0.2 || s.dayTime > 0.8;

  // Progressive station unlock
  if (s.elapsedTime >= s.nextStationUnlockTime) {
    s.nextStationUnlockTime += STATION_UNLOCK_INTERVAL;
    (['red', 'blue', 'green'] as const).forEach(line => {
      const order = UNLOCK_ORDER[line];
      const nextStation = order.find(id => !s.activeStationIds.includes(id));
      if (nextStation) {
        s.activeStationIds.push(nextStation);
        const st = s.stations.find(st => st.id === nextStation);
        if (st) { st.jellyVel.y = -4; st.jellyVel.x = 2; }
      }
    });
    audio.playClick();
  }

  // Available shapes
  const activeShapes = new Set<PassengerShape>();
  s.stations.filter(st => s.activeStationIds.includes(st.id) && !st.isDestroyed).forEach(st => {
    activeShapes.add(st.shape);
  });
  const availableShapes = Array.from(activeShapes);

  // Spawn passengers
  const spawnRate = Math.max(1500, GAME_CONFIG.PASSENGER_SPAWN_INTERVAL - s.elapsedTime * 0.008);
  if (Math.random() < realDt / spawnRate) {
    const openStations = s.stations.filter(st =>
      s.activeStationIds.includes(st.id) && st.isOpen && !st.isDestroyed &&
      st.passengers.length < st.maxPassengers
    );
    if (openStations.length > 0 && availableShapes.length > 1) {
      const station = openStations[Math.floor(Math.random() * openStations.length)];
      const possibleShapes = availableShapes.filter(sh => sh !== station.shape);
      if (possibleShapes.length > 0) {
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        station.passengers.push({ id: uid(), shape, spawnTime: s.elapsedTime, stationId: station.id });
        station.jellyVel.y = -2;
      }
    }
  }

  // Update trains
  s.trains = s.trains.map(train => {
    const t = { ...train };
    const route = getActiveLineStations(s, t.line);
    if (!route || route.length < 2) return t;

    // Clamp routeIndex to valid range (route may have changed)
    t.routeIndex = Math.max(0, Math.min(route.length - 1, t.routeIndex));

    if (t.isDwelling) {
      t.dwellTimer -= realDt;
      if (t.dwellTimer <= 0) {
        t.isDwelling = false;
        t.progress = 0;
        // Check if we need to reverse at ends
        const peekNext = t.routeIndex + t.direction;
        if (peekNext >= route.length || peekNext < 0) {
          t.direction = (t.direction * -1) as 1 | -1;
        }
      }
      // Stay at current station during dwell
      const curStData = STATION_MAP.get(route[t.routeIndex]);
      if (curStData) { t.x = curStData.x; t.y = curStData.y; }
      return t;
    }

    // Calculate next station index
    const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
    
    // If we're at an end and can't move, just dwell
    if (nextIdx === t.routeIndex) {
      t.direction = (t.direction * -1) as 1 | -1;
      t.isDwelling = true;
      t.dwellTimer = GAME_CONFIG.DWELL_TIME;
      const curStData2 = STATION_MAP.get(route[t.routeIndex]);
      if (curStData2) { t.x = curStData2.x; t.y = curStData2.y; }
      return t;
    }

    t.progress += (t.speed * realDt) / 2500;

    // Interpolate position between current and next station
    const curStConst = STATION_MAP.get(route[t.routeIndex]);
    const nextStConst = STATION_MAP.get(route[nextIdx]);
    if (curStConst && nextStConst) {
      const eased = easeInOutQuad(Math.min(t.progress, 1));
      t.x = curStConst.x + (nextStConst.x - curStConst.x) * eased;
      t.y = curStConst.y + (nextStConst.y - curStConst.y) * eased;
    }

    if (t.progress >= 1) {
      // Arrived at next station — advance routeIndex FIRST
      t.routeIndex = nextIdx;
      t.progress = 0;
      t.isDwelling = true;
      t.dwellTimer = GAME_CONFIG.DWELL_TIME;

      // Snap to destination
      const arrStation = s.stations.find(st => st.id === route[t.routeIndex]);
      if (arrStation) {
        t.x = arrStation.x;
        t.y = arrStation.y;
      }

      // Load/unload passengers at arrival station
      if (arrStation && !arrStation.isDestroyed) {
        const station = arrStation;
        const matching = t.passengers.filter(p => p.shape === station.shape);
        if (matching.length > 0) {
          const earned = Math.round(matching.length * s.combo);
          s.score += earned;
          s.money += Math.round(earned * 0.5);
          s.passengersDelivered += matching.length;
          s.combo = Math.min(Math.round((s.combo + 0.2) * 10) / 10, 5);
          s.maxCombo = Math.max(s.maxCombo, s.combo);
          t.passengers = t.passengers.filter(p => p.shape !== station.shape);
          addNotification(s, `+${earned}`, station.x, station.y, '#2ecc71');
          audio.playSuccess();
        }
        const space = t.capacity - t.passengers.length;
        if (space > 0 && station.passengers.length > 0) {
          const pickup = station.passengers.splice(0, space);
          t.passengers.push(...pickup);
        }
        station.jellyVel.y = -1.5;
      }
    }

    return t;
  });

  // Station overflow
  let totalPassengers = 0;
  s.stations.forEach(station => {
    if (!s.activeStationIds.includes(station.id)) return;
    totalPassengers += station.passengers.length;
    if (station.passengers.length >= station.maxPassengers && !station.isDestroyed) {
      s.combo = 1;
      if (station.passengers.length > station.maxPassengers + 2) {
        s.lives--;
        station.passengers.splice(0, 3);
        station.jellyVel.x = 5; station.jellyVel.y = 5;
        if (s.lives <= 0) s.gameOver = true;
      }
    }
  });
  s.peakLoad = Math.max(s.peakLoad, totalPassengers);

  // Air raid system
  if (!s.isAirRaid) {
    if (s.elapsedTime > s.nextRaidTime) {
      s.isAirRaid = true;
      s.airRaidTimer = 0;
      audio.startSiren();
      s.surfaceVehicles.forEach(v => { v.isFrozen = true; });
    }
  } else {
    s.airRaidTimer += realDt;

    // Spawn drones (different types)
    if (Math.random() < realDt / GAME_CONFIG.DRONE_SPAWN_INTERVAL) {
      const activeStations = s.stations.filter(st => !st.isDestroyed && s.activeStationIds.includes(st.id));
      const targetStation = activeStations[Math.floor(Math.random() * activeStations.length)];
      if (targetStation) {
        const edge = Math.random();
        let dx = 0, dy = 0;
        if (edge < 0.25) { dx = -0.05; dy = Math.random(); }
        else if (edge < 0.5) { dx = 1.05; dy = Math.random(); }
        else if (edge < 0.75) { dx = Math.random(); dy = -0.05; }
        else { dx = Math.random(); dy = 1.05; }

        // Random drone type weighted by game progress
        const types: DroneType[] = ['shahed', 'shahed', 'molniya', 'gerbera'];
        const droneType = types[Math.floor(Math.random() * types.length)];
        const config = DRONE_TYPES[droneType];

        s.drones.push({
          id: uid(), x: dx, y: dy,
          targetStationId: targetStation.id,
          speed: config.speed,
          angle: 0, isDestroyed: false,
          wobble: Math.random() * Math.PI * 2,
          droneType, hp: config.hp, maxHp: config.hp,
        });
        s.totalDrones++;
        audio.playDroneHum();
      }
    }

    if (s.airRaidTimer > GAME_CONFIG.AIR_RAID_DURATION) {
      s.isAirRaid = false;
      s.nextRaidTime = s.elapsedTime + GAME_CONFIG.AIR_RAID_MIN_INTERVAL +
        Math.random() * (GAME_CONFIG.AIR_RAID_MAX_INTERVAL - GAME_CONFIG.AIR_RAID_MIN_INTERVAL);
      s.drones = s.drones.filter(d => !d.isDestroyed);
      audio.stopSiren();
      audio.playAllClear();
      s.surfaceVehicles.forEach(v => { v.isFrozen = false; });
    }
  }

  // Update drones
  s.drones = s.drones.filter(d => {
    if (d.isDestroyed) return false;
    const target = s.stations.find(st => st.id === d.targetStationId);
    if (!target) return false;

    // Anti-air auto-intercept
    if (target.hasAntiAir && target.shieldTimer <= 0) {
      const dx = target.x - d.x;
      const dy = target.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.06) {
        d.hp--;
        if (d.hp <= 0) {
          d.isDestroyed = true;
          s.dronesIntercepted++;
          s.score += 15;
          s.money += 10;
          audio.playIntercept();
          s.explosions.push({ x: d.x, y: d.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
          addNotification(s, 'ПРО збив!', d.x, d.y, '#3498db');
          return false;
        }
      }
    }

    // Shield protection
    if (target.shieldTimer > 0) {
      const dx = target.x - d.x;
      const dy = target.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.03) {
        d.isDestroyed = true;
        s.dronesIntercepted++;
        audio.playIntercept();
        s.explosions.push({ x: d.x, y: d.y, radius: 0, maxRadius: 20, alpha: 1, time: 0 });
        return false;
      }
    }

    const dx = target.x - d.x;
    const dy = target.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    d.angle = Math.atan2(dy, dx);
    d.wobble += realDt * 0.005;

    if (dist < 0.015) {
      const config = DRONE_TYPES[d.droneType];
      target.hp -= config.damage;
      target.isOnFire = true;
      target.fireTimer = 5000;
      target.jellyVel.x = 8; target.jellyVel.y = 8;
      s.screenShake = 10;
      audio.playExplosion();
      s.explosions.push({ x: target.x, y: target.y, radius: 0, maxRadius: 40, alpha: 1, time: 0 });
      addNotification(s, `💥 -${config.damage}HP`, target.x, target.y, '#e74c3c');
      if (target.hp <= 0) {
        target.isDestroyed = true;
        target.isOpen = false;
        s.stationsDestroyed++;
        s.lives--;
        if (s.lives <= 0) s.gameOver = true;
      }
      return false;
    }

    const moveSpeed = d.speed * realDt / 1000;
    d.x += (dx / dist) * moveSpeed * 0.03;
    d.y += (dy / dist) * moveSpeed * 0.03;
    return true;
  });

  // QTE
  if (!s.qteActive && s.drones.filter(d => !d.isDestroyed).length > 0 && Math.random() < realDt / 3000) {
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
  if (s.qteActive) {
    s.qteTimer -= realDt;
    if (s.qteTimer <= 0) { s.qteActive = false; s.qteDroneId = null; }
  }

  // Explosions
  s.explosions = s.explosions.filter(e => {
    e.time += realDt;
    e.radius = e.maxRadius * Math.min(1, e.time / 500);
    e.alpha = Math.max(0, 1 - e.time / 1000);
    return e.alpha > 0;
  });

  // Repair units
  s.repairUnits = s.repairUnits.filter(r => {
    const target = s.stations.find(st => st.id === r.targetStationId);
    if (!target) return false;
    const dx = target.x - r.x;
    const dy = target.y - r.y;
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
        audio.playSuccess();
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

  // Shield timers
  s.stations.forEach(st => {
    if (st.shieldTimer > 0) st.shieldTimer -= realDt;
  });

  // Fire/jelly physics
  s.stations.forEach(station => {
    if (station.isOnFire) {
      station.fireTimer -= realDt;
      if (station.fireTimer <= 0) station.isOnFire = false;
    }
    const springK = 0.15;
    const damping = 0.85;
    station.jellyVel.x += -station.jellyOffset.x * springK;
    station.jellyVel.y += -station.jellyOffset.y * springK;
    station.jellyVel.x *= damping;
    station.jellyVel.y *= damping;
    station.jellyOffset.x += station.jellyVel.x;
    station.jellyOffset.y += station.jellyVel.y;
  });

  // Notifications
  s.notifications = s.notifications.filter(n => {
    n.timer -= realDt;
    n.y -= realDt * 0.00002;
    return n.timer > 0;
  });

  s.screenShake *= 0.9;
  if (s.screenShake < 0.5) s.screenShake = 0;

  // Surface routes
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

  s.surfaceVehicles.forEach(v => {
    if (v.isFrozen) return;
    const route = SURFACE_ROUTES.find(r => r.id === v.routeId);
    if (!route) return;
    v.progress += realDt / 3000;
    if (v.progress >= 1) {
      v.progress = 0;
      const nextIdx = v.stopIndex + v.direction;
      if (nextIdx >= route.stops.length - 1 || nextIdx <= 0) {
        v.direction = (v.direction * -1) as 1 | -1;
      }
      v.stopIndex = Math.max(0, Math.min(route.stops.length - 1, v.stopIndex + v.direction));
      if (v.passengers.length > 0) {
        s.score += v.passengers.length;
        s.passengersDelivered += v.passengers.length;
        v.passengers = [];
      }
    }
    const curStop = route.stops[v.stopIndex];
    const nextIdx = Math.max(0, Math.min(route.stops.length - 1, v.stopIndex + v.direction));
    const nextStop = route.stops[nextIdx];
    v.x = curStop.x + (nextStop.x - curStop.x) * v.progress;
    v.y = curStop.y + (nextStop.y - curStop.y) * v.progress;
  });

  // Network efficiency
  const totalCap = s.trains.reduce((sum, t) => sum + t.capacity, 0);
  const totalUsed = s.trains.reduce((sum, t) => sum + t.passengers.length, 0);
  s.networkEfficiency = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;

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
        audio.playIntercept();
        state.explosions.push({ x: drone.x, y: drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
        addNotification(state, `🎯 +${Math.round(10 * state.combo)}`, drone.x, drone.y, '#f1c40f');
      } else {
        addNotification(state, `💥 ${drone.hp}/${drone.maxHp} HP`, drone.x, drone.y, '#e67e22');
        audio.playClick();
      }
    }
    state.qteActive = false;
    state.qteDroneId = null;
  }
  return state;
}

// ===== Repair Dispatch =====
export function dispatchRepair(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
  if (!station || (!station.isDestroyed && !station.isOnFire)) return state;
  if (state.repairUnits.some(r => r.targetStationId === stationId)) return state;
  state.repairUnits.push({
    id: uid(), x: 0.02, y: 0.95,
    targetStationId: stationId, progress: 0, speed: 1.5,
  });
  return state;
}

// ===== Reverse Train =====
export function reverseTrain(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (train) train.direction = (train.direction * -1) as 1 | -1;
  return state;
}

// ===== 10 NEW GAMEPLAY FUNCTIONS =====

// 1. Purchase Train
export function purchaseTrain(state: GameState, line: 'red' | 'blue' | 'green'): GameState {
  if (state.money < GAME_CONFIG.TRAIN_COST) return state;
  const route = getActiveLineStations(state, line);
  if (route.length < 2) return state;
  const startStation = state.stations.find(s => s.id === route[0]);
  if (!startStation) return state;
  state.money -= GAME_CONFIG.TRAIN_COST;
  state.trains.push({
    id: uid(), line, routeIndex: 0, progress: 0, direction: 1,
    speed: GAME_CONFIG.TRAIN_SPEED, passengers: [],
    capacity: GAME_CONFIG.TRAIN_CAPACITY,
    x: startStation.x, y: startStation.y,
    dwellTimer: 0, isDwelling: false, level: 1,
  });
  return state;
}

// 2. Toggle Station Open/Closed
export function toggleStationOpen(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
  if (station && !station.isDestroyed) station.isOpen = !station.isOpen;
  return state;
}

// 3. Upgrade Train Capacity
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

// 4. Deploy Anti-Air at Station
export function deployAntiAir(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
  if (!station || station.hasAntiAir) return state;
  if (state.money < GAME_CONFIG.ANTI_AIR_COST) return state;
  state.money -= GAME_CONFIG.ANTI_AIR_COST;
  station.hasAntiAir = true;
  return state;
}

// 5. Activate Shield
export function activateShield(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
  if (!station || station.shieldTimer > 0) return state;
  if (state.money < GAME_CONFIG.SHIELD_COST) return state;
  state.money -= GAME_CONFIG.SHIELD_COST;
  station.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
  return state;
}

// 6. Set Speed Multiplier
export function setSpeedMultiplier(state: GameState, multiplier: number): GameState {
  state.speedMultiplier = Math.max(1, Math.min(10, multiplier));
  return state;
}

// 7. Reroute Train to Different Line
export function rerouteTrain(state: GameState, trainId: string, newLine: 'red' | 'blue' | 'green'): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (!train || train.line === newLine) return state;
  const route = getActiveLineStations(state, newLine);
  if (route.length < 2) return state;
  const startStation = state.stations.find(s => s.id === route[0]);
  if (!startStation) return state;
  train.line = newLine;
  train.routeIndex = 0;
  train.progress = 0;
  train.x = startStation.x;
  train.y = startStation.y;
  train.isDwelling = false;
  return state;
}

// 8. Evacuate Station (disperse all passengers)
export function evacuateStation(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
  if (!station || station.passengers.length === 0) return state;
  // Distribute passengers to nearby stations on same line
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

// 9. Call Reinforcements (extra DSNS units)
export function callReinforcements(state: GameState): GameState {
  if (state.money < GAME_CONFIG.REINFORCEMENT_COST) return state;
  state.money -= GAME_CONFIG.REINFORCEMENT_COST;
  const damaged = state.stations.filter(s =>
    (s.isDestroyed || s.isOnFire) &&
    !state.repairUnits.some(r => r.targetStationId === s.id)
  );
  damaged.forEach(station => {
    state.repairUnits.push({
      id: uid(), x: 0.02, y: 0.95,
      targetStationId: station.id, progress: 0, speed: 2.0,
    });
  });
  return state;
}

// 10. Upgrade Station (increase max HP and capacity)
export function upgradeStation(state: GameState, stationId: string): GameState {
  const station = state.stations.find(s => s.id === stationId);
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
