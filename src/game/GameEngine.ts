import { STATIONS, GAME_CONFIG, METRO_LINES, SURFACE_ROUTES, DNIPRO_RIVER_POINTS, PassengerShape, SHAPE_COLORS } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, Explosion, SurfaceVehicle, RepairUnit } from './types';
import { AudioEngine } from './AudioEngine';

let nextId = 0;
const uid = () => `${++nextId}`;

const SHAPES: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];

// Starting 6 central stations (2 per line)
const STARTING_STATIONS = ['r10', 'r11', 'b7', 'b8', 'g4', 'g5'];

// Unlock order: expand outward from center
const UNLOCK_ORDER: Record<string, string[]> = {
  red: ['r9', 'r12', 'r8', 'r13', 'r7', 'r14', 'r6', 'r15', 'r5', 'r16', 'r4', 'r17', 'r3', 'r18', 'r2', 'r1'],
  blue: ['b6', 'b9', 'b5', 'b10', 'b4', 'b11', 'b3', 'b12', 'b2', 'b13', 'b1', 'b14', 'b15', 'b16'],
  green: ['g3', 'g6', 'g2', 'g7', 'g1', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15'],
};

const STATION_UNLOCK_INTERVAL = 20000; // unlock one per line every 20s

function easeInOutQuad(t: number): number {
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
    isDestroyed: false,
    isOnFire: false,
    fireTimer: 0,
    isRepairing: false,
    repairProgress: 0,
    jellyOffset: { x: 0, y: 0 },
    jellyVel: { x: 0, y: 0 },
    isOpen: true,
    shelterCount: 0,
  }));

  // Create 1 train per line on starting stations
  const trains: Train[] = [];
  (['red', 'blue', 'green'] as const).forEach(line => {
    const lineStartStations = STARTING_STATIONS.filter(id => id.startsWith(line[0]));
    if (lineStartStations.length < 2) return;
    const st = stations.find(s => s.id === lineStartStations[0])!;
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
    unlockedRoutes: [],
    selectedTrain: null,
    hoveredStation: null,
    activeStationIds: [...STARTING_STATIONS],
    nextStationUnlockTime: STATION_UNLOCK_INTERVAL,
    qteActive: false,
    qteDroneId: null,
    qteKey: 'Q',
    qteTimer: 0,
  };
}

function getActiveLineStations(state: GameState, line: string): string[] {
  return STATIONS
    .filter(s => s.line === line && state.activeStationIds.includes(s.id))
    .map(s => s.id);
}

export function updateGame(state: GameState, dt: number, audio: AudioEngine): GameState {
  if (!state.gameStarted || state.gameOver || state.isPaused) return state;

  const s = { ...state };
  s.elapsedTime += dt;

  // Day/night cycle
  s.dayTime = (s.dayTime + dt / GAME_CONFIG.DAY_CYCLE_DURATION) % 1;
  s.isNight = s.dayTime < 0.2 || s.dayTime > 0.8;

  // Progressive station unlock
  if (s.elapsedTime >= s.nextStationUnlockTime) {
    s.nextStationUnlockTime += STATION_UNLOCK_INTERVAL;
    let unlocked = false;
    (['red', 'blue', 'green'] as const).forEach(line => {
      const order = UNLOCK_ORDER[line];
      const nextStation = order.find(id => !s.activeStationIds.includes(id));
      if (nextStation) {
        s.activeStationIds.push(nextStation);
        unlocked = true;
        // Jelly bounce on the new station
        const st = s.stations.find(st => st.id === nextStation);
        if (st) { st.jellyVel.y = -4; st.jellyVel.x = 2; }
      }
    });
    if (unlocked) {
      audio.playClick();
    }
  }

  // Determine available shapes based on active stations
  const activeShapes = new Set<PassengerShape>();
  s.stations.filter(st => s.activeStationIds.includes(st.id) && !st.isDestroyed).forEach(st => {
    activeShapes.add(st.shape);
  });
  const availableShapes = Array.from(activeShapes);

  // Spawn passengers
  const spawnRate = Math.max(1500, GAME_CONFIG.PASSENGER_SPAWN_INTERVAL - s.elapsedTime * 0.008);
  if (Math.random() < dt / spawnRate) {
    const openStations = s.stations.filter(st =>
      s.activeStationIds.includes(st.id) && st.isOpen && !st.isDestroyed &&
      st.passengers.length < GAME_CONFIG.MAX_PASSENGERS_PER_STATION
    );
    if (openStations.length > 0 && availableShapes.length > 1) {
      const station = openStations[Math.floor(Math.random() * openStations.length)];
      // Passenger wants a shape different from current station
      const possibleShapes = availableShapes.filter(sh => sh !== station.shape);
      if (possibleShapes.length > 0) {
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        station.passengers.push({
          id: uid(),
          shape,
          spawnTime: s.elapsedTime,
          stationId: station.id,
        });
        // Jelly bounce on spawn
        station.jellyVel.y = -2;
      }
    }
  }

  // Update trains with dwell mechanics
  s.trains = s.trains.map(train => {
    const t = { ...train };
    const route = getActiveLineStations(s, t.line);
    if (!route || route.length < 2) return t;

    if (t.isDwelling) {
      // Dwelling at station - loading/unloading
      t.dwellTimer -= dt;
      if (t.dwellTimer <= 0) {
        t.isDwelling = false;
        // Move to next station
        const nextIdx = t.routeIndex + t.direction;
        if (nextIdx >= route.length || nextIdx < 0) {
          t.direction = (t.direction * -1) as 1 | -1;
        }
        t.routeIndex = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
        t.progress = 0;
      }
      // Stay at current station position
      const curStation = s.stations.find(st => st.id === route[t.routeIndex]);
      if (curStation) { t.x = curStation.x; t.y = curStation.y; }
      return t;
    }

    // Moving between stations
    t.progress += (t.speed * dt) / 2500;

    if (t.progress >= 1) {
      t.progress = 1;
      t.isDwelling = true;
      t.dwellTimer = 1200; // dwell for 1.2 seconds

      // Arrive at next station
      const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
      const station = s.stations.find(st => st.id === route[nextIdx]);
      if (station && !station.isDestroyed) {
        // Drop off passengers matching this station's shape
        const matching = t.passengers.filter(p => p.shape === station.shape);
        if (matching.length > 0) {
          s.score += Math.round(matching.length * s.combo);
          s.passengersDelivered += matching.length;
          s.combo = Math.min(Math.round((s.combo + 0.2) * 10) / 10, 5);
          s.maxCombo = Math.max(s.maxCombo, s.combo);
          t.passengers = t.passengers.filter(p => p.shape !== station.shape);
          audio.playSuccess();
        }

        // Pick up passengers
        const space = t.capacity - t.passengers.length;
        if (space > 0 && station.passengers.length > 0) {
          const pickup = station.passengers.splice(0, space);
          t.passengers.push(...pickup);
        }

        // Jelly bounce on arrival
        station.jellyVel.y = -1.5;
      }
    }

    // Interpolate position with easing
    const curStation = s.stations.find(st => st.id === route[t.routeIndex]);
    const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
    const nextStation = s.stations.find(st => st.id === route[nextIdx]);
    if (curStation && nextStation) {
      const eased = easeInOutQuad(t.progress);
      t.x = curStation.x + (nextStation.x - curStation.x) * eased;
      t.y = curStation.y + (nextStation.y - curStation.y) * eased;
    }

    return t;
  });

  // Check station overflow
  let totalPassengers = 0;
  s.stations.forEach(station => {
    if (!s.activeStationIds.includes(station.id)) return;
    totalPassengers += station.passengers.length;
    if (station.passengers.length >= GAME_CONFIG.MAX_PASSENGERS_PER_STATION && !station.isDestroyed) {
      s.combo = 1;
      if (station.passengers.length > GAME_CONFIG.MAX_PASSENGERS_PER_STATION + 2) {
        s.lives--;
        station.passengers.splice(0, 3);
        station.jellyVel.x = 5;
        station.jellyVel.y = 5;
        if (s.lives <= 0) {
          s.gameOver = true;
        }
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
    s.airRaidTimer += dt;

    // Spawn drones
    if (Math.random() < dt / GAME_CONFIG.DRONE_SPAWN_INTERVAL) {
      const activeStations = s.stations.filter(st => !st.isDestroyed && s.activeStationIds.includes(st.id));
      const targetStation = activeStations[Math.floor(Math.random() * activeStations.length)];
      if (targetStation) {
        const edge = Math.random();
        let dx = 0, dy = 0;
        if (edge < 0.25) { dx = -0.05; dy = Math.random(); }
        else if (edge < 0.5) { dx = 1.05; dy = Math.random(); }
        else if (edge < 0.75) { dx = Math.random(); dy = -0.05; }
        else { dx = Math.random(); dy = 1.05; }

        const drone: Drone = {
          id: uid(),
          x: dx, y: dy,
          targetStationId: targetStation.id,
          speed: GAME_CONFIG.DRONE_SPEED,
          angle: 0,
          isDestroyed: false,
          wobble: Math.random() * Math.PI * 2,
        };
        s.drones.push(drone);
        s.totalDrones++;
        audio.playDroneHum();
      }
    }

    if (s.airRaidTimer > GAME_CONFIG.AIR_RAID_DURATION) {
      s.isAirRaid = false;
      s.nextRaidTime = s.elapsedTime + GAME_CONFIG.AIR_RAID_MIN_INTERVAL + Math.random() * (GAME_CONFIG.AIR_RAID_MAX_INTERVAL - GAME_CONFIG.AIR_RAID_MIN_INTERVAL);
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

    const dx = target.x - d.x;
    const dy = target.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    d.angle = Math.atan2(dy, dx);
    d.wobble += dt * 0.005;

    if (dist < 0.015) {
      target.hp -= 40;
      target.isOnFire = true;
      target.fireTimer = 5000;
      target.jellyVel.x = 8;
      target.jellyVel.y = 8;
      s.screenShake = 10;
      audio.playExplosion();
      s.explosions.push({ x: target.x, y: target.y, radius: 0, maxRadius: 40, alpha: 1, time: 0 });
      if (target.hp <= 0) {
        target.isDestroyed = true;
        target.isOpen = false;
        s.stationsDestroyed++;
        s.lives--;
        if (s.lives <= 0) s.gameOver = true;
      }
      return false;
    }

    const moveSpeed = d.speed * dt / 1000;
    d.x += (dx / dist) * moveSpeed * 0.03;
    d.y += (dy / dist) * moveSpeed * 0.03;
    return true;
  });

  // QTE for intercepting drones
  if (!s.qteActive && s.drones.length > 0 && Math.random() < dt / 3000) {
    const keys = ['Q', 'W', 'E', 'R'];
    s.qteActive = true;
    s.qteDroneId = s.drones[0].id;
    s.qteKey = keys[Math.floor(Math.random() * keys.length)];
    s.qteTimer = 2000;
  }
  if (s.qteActive) {
    s.qteTimer -= dt;
    if (s.qteTimer <= 0) { s.qteActive = false; s.qteDroneId = null; }
  }

  // Update explosions
  s.explosions = s.explosions.filter(e => {
    e.time += dt;
    e.radius = e.maxRadius * Math.min(1, e.time / 500);
    e.alpha = Math.max(0, 1 - e.time / 1000);
    return e.alpha > 0;
  });

  // Update repair units
  s.repairUnits = s.repairUnits.filter(r => {
    const target = s.stations.find(st => st.id === r.targetStationId);
    if (!target) return false;
    const dx = target.x - r.x;
    const dy = target.y - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.02) {
      r.progress += dt / GAME_CONFIG.REPAIR_TIME;
      if (r.progress >= 1) {
        target.hp = target.maxHp;
        target.isDestroyed = false;
        target.isOnFire = false;
        target.isOpen = true;
        target.isRepairing = false;
        s.stationsRepaired++;
        audio.playSuccess();
        return false;
      }
      target.isRepairing = true;
      target.repairProgress = r.progress;
      return true;
    }
    const moveSpeed = r.speed * dt / 1000;
    r.x += (dx / dist) * moveSpeed * 0.04;
    r.y += (dy / dist) * moveSpeed * 0.04;
    return true;
  });

  // Fire timer & jelly physics
  s.stations.forEach(station => {
    if (station.isOnFire) {
      station.fireTimer -= dt;
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

  // Screen shake decay
  s.screenShake *= 0.9;
  if (s.screenShake < 0.5) s.screenShake = 0;

  // Unlock surface routes
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

  // Update surface vehicles
  s.surfaceVehicles.forEach(v => {
    if (v.isFrozen) return;
    const route = SURFACE_ROUTES.find(r => r.id === v.routeId);
    if (!route) return;
    v.progress += dt / 3000;
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

export function handleQteInput(state: GameState, key: string, audio: AudioEngine): GameState {
  if (!state.qteActive) return state;
  if (key.toUpperCase() === state.qteKey) {
    const drone = state.drones.find(d => d.id === state.qteDroneId);
    if (drone) {
      drone.isDestroyed = true;
      state.dronesIntercepted++;
      state.score += Math.round(10 * state.combo);
      audio.playIntercept();
      state.explosions.push({ x: drone.x, y: drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
    }
    state.qteActive = false;
    state.qteDroneId = null;
  }
  return state;
}

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

export function reverseTrain(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (train) {
    train.direction = (train.direction * -1) as 1 | -1;
  }
  return state;
}
