import { STATIONS, GAME_CONFIG, METRO_LINES, SURFACE_ROUTES, DNIPRO_RIVER_POINTS, PassengerShape, SHAPE_COLORS } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, Explosion, SurfaceVehicle, RepairUnit } from './types';
import { AudioEngine } from './AudioEngine';

let nextId = 0;
const uid = () => `${++nextId}`;

const SHAPES: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];

export function createInitialState(): GameState {
  const stations: GameStation[] = STATIONS.map(s => ({
    ...s,
    isTransfer: s.isTransfer || false,
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

  // Create initial trains
  const trains: Train[] = [];
  const lineStations: Record<string, string[]> = {
    red: STATIONS.filter(s => s.line === 'red').map(s => s.id),
    blue: STATIONS.filter(s => s.line === 'blue').map(s => s.id),
    green: STATIONS.filter(s => s.line === 'green').map(s => s.id),
  };

  // 3 trains per line
  (['red', 'blue', 'green'] as const).forEach(line => {
    const ids = lineStations[line];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor((i / 3) * ids.length);
      const st = stations.find(s => s.id === ids[idx])!;
      trains.push({
        id: uid(),
        line,
        routeIndex: idx,
        progress: 0,
        direction: i % 2 === 0 ? 1 : -1,
        speed: GAME_CONFIG.TRAIN_SPEED,
        passengers: [],
        capacity: GAME_CONFIG.TRAIN_CAPACITY,
        x: st.x,
        y: st.y,
      });
    }
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
    qteActive: false,
    qteDroneId: null,
    qteKey: 'Q',
    qteTimer: 0,
  };
}

export function updateGame(state: GameState, dt: number, audio: AudioEngine): GameState {
  if (!state.gameStarted || state.gameOver || state.isPaused) return state;

  const s = { ...state };
  s.elapsedTime += dt;

  // Day/night cycle
  s.dayTime = (s.dayTime + dt / GAME_CONFIG.DAY_CYCLE_DURATION) % 1;
  s.isNight = s.dayTime < 0.2 || s.dayTime > 0.8;

  // Spawn passengers
  const spawnRate = Math.max(1000, GAME_CONFIG.PASSENGER_SPAWN_INTERVAL - s.elapsedTime * 0.01);
  if (Math.random() < dt / spawnRate) {
    const openStations = s.stations.filter(st => st.isOpen && !st.isDestroyed && st.passengers.length < GAME_CONFIG.MAX_PASSENGERS_PER_STATION);
    if (openStations.length > 0) {
      const station = openStations[Math.floor(Math.random() * openStations.length)];
      const shape = SHAPES[Math.floor(Math.random() * Math.min(3 + Math.floor(s.elapsedTime / 30000), SHAPES.length))];
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

  // Update trains
  const lineStationIds: Record<string, string[]> = {
    red: STATIONS.filter(st => st.line === 'red').map(st => st.id),
    blue: STATIONS.filter(st => st.line === 'blue').map(st => st.id),
    green: STATIONS.filter(st => st.line === 'green').map(st => st.id),
  };

  s.trains = s.trains.map(train => {
    const t = { ...train };
    const route = lineStationIds[t.line];
    if (!route || route.length < 2) return t;

    t.progress += (t.speed * dt) / 2000;

    if (t.progress >= 1) {
      t.progress = 0;
      // Arrive at station - drop off & pick up passengers
      const stIdx = t.routeIndex + t.direction;
      if (stIdx >= route.length - 1 || stIdx <= 0) {
        t.direction = (t.direction * -1) as 1 | -1;
      }
      t.routeIndex = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));

      const station = s.stations.find(st => st.id === route[t.routeIndex]);
      if (station && !station.isDestroyed) {
        // Drop off passengers (matching shape at this station type)
        const dropped = t.passengers.length;
        // Simple: drop all passengers (they've "arrived")
        if (t.passengers.length > 0) {
          s.score += t.passengers.length * s.combo;
          s.passengersDelivered += t.passengers.length;
          s.combo = Math.min(s.combo + 0.1, 5);
          s.maxCombo = Math.max(s.maxCombo, s.combo);
          t.passengers = [];
        }

        // Pick up passengers
        const space = t.capacity - t.passengers.length;
        if (space > 0 && station.passengers.length > 0) {
          const pickup = station.passengers.splice(0, space);
          t.passengers.push(...pickup);
        }
      }
    }

    // Interpolate position
    const route2 = lineStationIds[t.line];
    const nextIdx = Math.max(0, Math.min(route2.length - 1, t.routeIndex + t.direction));
    const curStation = s.stations.find(st => st.id === route2[t.routeIndex]);
    const nextStation = s.stations.find(st => st.id === route2[nextIdx]);
    if (curStation && nextStation) {
      t.x = curStation.x + (nextStation.x - curStation.x) * t.progress;
      t.y = curStation.y + (nextStation.y - curStation.y) * t.progress;
    }

    return t;
  });

  // Check station overflow
  let totalPassengers = 0;
  s.stations.forEach(station => {
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
      // Freeze surface vehicles
      s.surfaceVehicles.forEach(v => { v.isFrozen = true; });
    }
  } else {
    s.airRaidTimer += dt;

    // Spawn drones
    if (Math.random() < dt / GAME_CONFIG.DRONE_SPAWN_INTERVAL) {
      const targetStation = s.stations.filter(st => !st.isDestroyed)[Math.floor(Math.random() * s.stations.filter(st => !st.isDestroyed).length)];
      if (targetStation) {
        const edge = Math.random();
        let dx = 0, dy = 0;
        if (edge < 0.25) { dx = -0.05; dy = Math.random(); }
        else if (edge < 0.5) { dx = 1.05; dy = Math.random(); }
        else if (edge < 0.75) { dx = Math.random(); dy = -0.05; }
        else { dx = Math.random(); dy = 1.05; }

        const drone: Drone = {
          id: uid(),
          x: dx,
          y: dy,
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

    // End raid
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
      // Hit station!
      target.hp -= 40;
      target.isOnFire = true;
      target.fireTimer = 5000;
      target.jellyVel.x = 8;
      target.jellyVel.y = 8;
      s.screenShake = 10;
      audio.playExplosion();

      s.explosions.push({
        x: target.x,
        y: target.y,
        radius: 0,
        maxRadius: 40,
        alpha: 1,
        time: 0,
      });

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
    if (s.qteTimer <= 0) {
      s.qteActive = false;
      s.qteDroneId = null;
    }
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

  // Fire timer
  s.stations.forEach(station => {
    if (station.isOnFire) {
      station.fireTimer -= dt;
      if (station.fireTimer <= 0) {
        station.isOnFire = false;
      }
    }

    // Jelly physics
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
      // Create vehicle for this route
      s.surfaceVehicles.push({
        id: uid(),
        routeId: route.id,
        type: route.type,
        stopIndex: 0,
        progress: 0,
        direction: 1,
        x: route.stops[0].x,
        y: route.stops[0].y,
        passengers: [],
        isFrozen: false,
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
      // Drop off passengers
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
      state.score += 10 * state.combo;
      audio.playIntercept();
      state.explosions.push({
        x: drone.x, y: drone.y,
        radius: 0, maxRadius: 25, alpha: 1, time: 0,
      });
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
    id: uid(),
    x: 0.02,
    y: 0.95,
    targetStationId: stationId,
    progress: 0,
    speed: 1.5,
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
