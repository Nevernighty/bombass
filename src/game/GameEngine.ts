import { STATIONS, STATION_MAP, LINE_STATIONS, GAME_CONFIG, SURFACE_ROUTES, PassengerShape, DRONE_TYPES, BRIDGE_STATION_IDS } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, RepairUnit, DroneType, GameNotification, BuildingState, Decoy, GameMode, Achievement } from './types';
import { AudioEngine } from './AudioEngine';
import { EventBus } from './core/EventBus';
import { getCurrentWave, getCurrentWaveIndex, PATIENCE_BASE, PATIENCE_MIN, PATIENCE_DECAY_PER_WAVE } from './config/difficulty';
import { generateBuildingData } from './components/CityBuildings';
import { SCENARIOS, ACHIEVEMENT_DEFS } from './config/scenarios';

let nextId = 0;
const uid = () => `${++nextId}`;

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
const RUSH_HOUR_INTERVAL = 90000;
const RUSH_HOUR_DURATION = 15000;
const RUSH_HOUR_WARNING = 5000;

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function assignStationShape(station: typeof STATIONS[0], index: number): PassengerShape {
  if (station.isTransfer) return 'star';
  const lineShapes: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond'];
  return lineShapes[index % lineShapes.length];
}

function initBuildings(): BuildingState[] {
  const data = generateBuildingData();
  return data.map((b, i) => ({
    id: i, x: b.x, y: b.y,
    hp: 50, maxHp: 50, isDestroyed: false,
    height: b.h, width: b.w, depth: b.d,
  }));
}

function initAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map(d => ({
    ...d, unlocked: false,
  }));
}

export function createInitialState(mode: GameMode = 'classic'): GameState {
  const scenario = SCENARIOS[mode];
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
    isSheltering: false, tunnelSealTimer: 0, magnetTimer: 0,
    hasSAM: false, samCooldown: 0, hasAATurret: false, turretCooldown: 0, stationIncome: 0,
  }));

  const trains: Train[] = [];
  const linesToUse = scenario.activeLines;
  let trainsCreated = 0;
  linesToUse.forEach(line => {
    const lineStartStations = STARTING_STATIONS.filter(id => id.startsWith(line[0]));
    if (lineStartStations.length < 2) return;
    const st = STATION_MAP.get(lineStartStations[0])!;
    if (trainsCreated < scenario.startTrains) {
      trains.push({
        id: uid(), line, routeIndex: 0, progress: 0, direction: 1,
        speed: GAME_CONFIG.TRAIN_SPEED, passengers: [], capacity: GAME_CONFIG.TRAIN_CAPACITY,
        x: st.x, y: st.y, dwellTimer: 0, isDwelling: false, level: 1,
      });
      trainsCreated++;
    }
  });
  // If mode wants more trains, add extras
  while (trainsCreated < scenario.startTrains) {
    const line = linesToUse[trainsCreated % linesToUse.length];
    const lineStations = STARTING_STATIONS.filter(id => id.startsWith(line[0]));
    if (lineStations.length > 0) {
      const st = STATION_MAP.get(lineStations[Math.min(1, lineStations.length - 1)])!;
      trains.push({
        id: uid(), line, routeIndex: 0, progress: 0, direction: -1,
        speed: GAME_CONFIG.TRAIN_SPEED, passengers: [], capacity: GAME_CONFIG.TRAIN_CAPACITY,
        x: st.x, y: st.y, dwellTimer: 0, isDwelling: false, level: 1,
      });
    }
    trainsCreated++;
  }

  return {
    stations, trains, drones: [], surfaceVehicles: [], explosions: [], repairUnits: [],
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, targetX: 0, targetY: 0, mode: 'free' as const, orbitAngle: 0, orbitSpeed: 0.3 },
    score: 0, lives: scenario.startLives, combo: 1, maxCombo: 1, money: scenario.startMoney,
    passengersDelivered: 0, passengersAbandoned: 0,
    dronesIntercepted: 0, totalDrones: 0,
    stationsDestroyed: 0, stationsRepaired: 0,
    networkEfficiency: 100, peakLoad: 0,
    dayTime: scenario.permanentNight ? 0.1 : 0.25, isNight: scenario.permanentNight,
    isAirRaid: scenario.continuousRaids, airRaidTimer: 0, raidDronesSpawned: 0,
    nextRaidTime: scenario.noRaids ? Infinity : (scenario.continuousRaids ? 0 :
      GAME_CONFIG.AIR_RAID_MIN_INTERVAL + Math.random() * (GAME_CONFIG.AIR_RAID_MAX_INTERVAL - GAME_CONFIG.AIR_RAID_MIN_INTERVAL)),
    screenShake: 0, gameOver: false, gameStarted: false, isPaused: false,
    elapsedTime: 0, speedMultiplier: 1, unlockedRoutes: [],
    selectedTrain: null, hoveredStation: null,
    activeStationIds: [...STARTING_STATIONS],
    nextStationUnlockTime: STATION_UNLOCK_INTERVAL,
    notifications: [], waveIndex: 0,
    // Phase 4
    buildings: initBuildings(),
    selectedDroneId: null,
    powerGrid: 100, maxPower: 100, generators: 0,
    rushHourTimer: RUSH_HOUR_INTERVAL, rushHourActive: false, rushHourCooldown: 0,
    radarActive: false, radarWarnings: [],
    decoys: [],
    speedBoostLine: null, speedBoostTimer: 0, speedBoostCooldown: 0,
    comboMilestones: [], buildingsDestroyed: 0,
    // Phase 5
    gameMode: mode,
    achievements: initAchievements(),
    satisfactionRate: 100,
    doubleFareTimer: 0,
    expressLineId: null, expressTimer: 0,
    blackoutMode: false,
    signalFlareTimer: 0,
    droneJammerTimer: 0,
    emergencyBrakeTimer: 0,
    stationMagnetId: null, stationMagnetTimer: 0,
    winConditionMet: false,
    modeTimer: 0,
    // Phase 6
    interceptorDrones: [],
    tracerLines: [],
    isRaining: false,
    weatherTimer: 30000 + Math.random() * 60000,
    autoRepairTimer: 0,
    _cachedLineStations: {},
  };
}

export function getActiveLineStations(state: GameState, line: string): string[] {
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
  const scenario = SCENARIOS[s.gameMode];

  const activeShapes = new Set<PassengerShape>();
  for (const st of s.stations) {
    if (activeSet.has(st.id) && !st.isDestroyed) activeShapes.add(st.shape);
  }
  const availableShapes = Array.from(activeShapes);

  const rushMult = s.rushHourActive ? 3 : 1;
  const blackoutMult = s.blackoutMode ? 0.5 : 1;
  const scenarioMult = scenario.passengerMultiplier;
  const effectiveSpawnRate = wave.passengerSpawnRate / (rushMult * blackoutMult * scenarioMult);

  if (Math.random() < realDt / effectiveSpawnRate && availableShapes.length > 1) {
    const openStations = s.stations.filter(st =>
      activeSet.has(st.id) && st.isOpen && !st.isDestroyed && !st.isSheltering && st.passengers.length < st.maxPassengers
    );
    if (openStations.length > 0) {
      // Station magnet: weighted selection
      let station: GameStation;
      if (s.stationMagnetId && Math.random() < 0.5) {
        const magnet = getStation(s, s.stationMagnetId);
        if (magnet && !magnet.isDestroyed && magnet.isOpen && magnet.passengers.length < magnet.maxPassengers) {
          station = magnet;
        } else {
          station = openStations[Math.floor(Math.random() * openStations.length)];
        }
      } else {
        station = openStations[Math.floor(Math.random() * openStations.length)];
      }
      const possibleShapes = availableShapes.filter(sh => sh !== station.shape);
      if (possibleShapes.length > 0) {
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        const patienceMs = Math.max(PATIENCE_MIN, PATIENCE_BASE - s.waveIndex * PATIENCE_DECAY_PER_WAVE);
        station.passengers.push({ id: uid(), shape, spawnTime: s.elapsedTime, stationId: station.id, patience: patienceMs });
        station.jellyVel.y = -2;
      }
    }
  }

  // Patience decay
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

  // Satisfaction rate
  const total = s.passengersDelivered + s.passengersAbandoned;
  s.satisfactionRate = total > 0 ? Math.round((s.passengersDelivered / total) * 100) : 100;
}

// ==================== SYSTEM: Trains ====================
function updateTrains(s: GameState, realDt: number, events: EventBus): void {
  // Emergency brake
  if (s.emergencyBrakeTimer > 0) return;

  s.trains = s.trains.map(train => {
    const t = { ...train };
    const route = getActiveLineStations(s, t.line);
    if (!route || route.length < 2) return t;

    t.routeIndex = Math.max(0, Math.min(route.length - 1, t.routeIndex));

    // Speed boost
    const boostMult = (s.speedBoostLine === t.line && s.speedBoostTimer > 0) ? 2 : 1;
    const expressMult = (s.expressLineId === t.line && s.expressTimer > 0) ? 3 : 1;
    const speedMult = Math.max(boostMult, expressMult);

    if (t.isDwelling) {
      // Express line: skip dwell at non-terminal stations
      if (expressMult > 1 && t.routeIndex > 0 && t.routeIndex < route.length - 1) {
        t.isDwelling = false;
        t.dwellTimer = 0;
      } else {
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

    const curStation = getStation(s, route[t.routeIndex]);
    if (curStation && curStation.tunnelSealTimer > 0) {
      t.isDwelling = true;
      t.dwellTimer = 500;
      return t;
    }

    t.progress += (t.speed * speedMult * realDt) / 2500;

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
          const matching = t.passengers.filter(p => p.shape === arrStation.shape);
          if (matching.length > 0) {
            const fareMult = s.doubleFareTimer > 0 ? 2 : 1;
            const earned = Math.round(matching.length * s.combo * fareMult);
            s.score += earned;
            s.money += Math.round(earned * 0.5);
            s.passengersDelivered += matching.length;
            s.combo = Math.min(Math.round((s.combo + 0.2) * 10) / 10, 5);
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            t.passengers = t.passengers.filter(p => p.shape !== arrStation.shape);
            addNotification(s, `+${earned}`, arrStation.x, arrStation.y, '#2ecc71');
            events.emit({ type: 'PASSENGER_DELIVERED', x: arrStation.x, y: arrStation.y, data: { count: matching.length } });
          }

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
  // Jammer effect
  const jammerMult = s.droneJammerTimer > 0 ? 0.5 : 1;

  // Auto-attack from anti-air stations targeting selectedDroneId
  if (s.selectedDroneId) {
    const selDrone = s.drones.find(d => d.id === s.selectedDroneId && !d.isDestroyed);
    if (!selDrone) {
      s.selectedDroneId = null;
    } else {
      for (const st of s.stations) {
        if (!st.hasAntiAir || st.isDestroyed) continue;
        const dx = st.x - selDrone.x, dy = st.y - selDrone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.15 && Math.random() < realDt / 800) {
          selDrone.hp--;
          addNotification(s, '🎯', selDrone.x, selDrone.y, '#3498db');
          if (selDrone.hp <= 0) {
            selDrone.isDestroyed = true;
            s.dronesIntercepted++;
            s.score += 15;
            s.money += 10;
            s.explosions.push({ x: selDrone.x, y: selDrone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
            events.emit({ type: 'DRONE_DESTROYED', x: selDrone.x, y: selDrone.y });
            s.selectedDroneId = null;
          }
          break;
        }
      }
    }
  }

  s.drones = s.drones.filter(d => {
    if (d.isDestroyed) return false;

    let targetX: number, targetY: number;
    const closestDecoy = s.decoys.length > 0 ? s.decoys.reduce((closest, decoy) => {
      const ddx = decoy.x - d.x, ddy = decoy.y - d.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (!closest || dist < closest.dist) return { decoy, dist };
      return closest;
    }, null as { decoy: Decoy; dist: number } | null) : null;

    if (closestDecoy && closestDecoy.dist < 0.3 && d.id.charCodeAt(0) % 5 < 2) {
      targetX = closestDecoy.decoy.x;
      targetY = closestDecoy.decoy.y;
    } else {
      const target = getStation(s, d.targetStationId);
      if (!target) return false;
      targetX = target.x;
      targetY = target.y;
    }

    const target = getStation(s, d.targetStationId);
    if (!target) return false;

    // Blackout miss chance
    if (s.blackoutMode && Math.random() < 0.001 * realDt) {
      // Drone misses — changes to random target
      const activeSet = new Set(s.activeStationIds);
      const activeStations = s.stations.filter(st => !st.isDestroyed && activeSet.has(st.id));
      if (activeStations.length > 0) {
        d.targetStationId = activeStations[Math.floor(Math.random() * activeStations.length)].id;
      }
    }

    // Anti-air intercept
    if (target.hasAntiAir && target.shieldTimer <= 0 && s.selectedDroneId !== d.id) {
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

    const dx = targetX - d.x, dy = targetY - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    d.angle = Math.atan2(dy, dx);
    d.wobble += realDt * 0.005;

    // Hit target
    if (dist < 0.015) {
      const config = DRONE_TYPES[d.droneType];

      // 30% chance to hit a building instead
      if (d.targetBuildingIdx === -1 && Math.random() < 0.3 && s.buildings.length > 0) {
        let nearestBldg = -1;
        let nearestDist = Infinity;
        for (let bi = 0; bi < s.buildings.length; bi++) {
          const b = s.buildings[bi];
          if (b.isDestroyed) continue;
          const bdx = b.x - d.x, bdy = b.y - d.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bdist < nearestDist) { nearestDist = bdist; nearestBldg = bi; }
        }
        if (nearestBldg >= 0 && nearestDist < 0.1) {
          const bldg = s.buildings[nearestBldg];
          bldg.hp -= config.damage;
          s.explosions.push({ x: bldg.x, y: bldg.y, radius: 0, maxRadius: 30, alpha: 1, time: 0 });
          if (bldg.hp <= 0) {
            bldg.isDestroyed = true;
            bldg.hp = 0;
            s.buildingsDestroyed++;
            addNotification(s, '🏚️', bldg.x, bldg.y, '#888');
          }
          s.screenShake = 5;
          return false;
        }
      }

      const damageMult = BRIDGE_STATION_IDS.has(d.targetStationId) ? 2 : 1;

      target.hp -= config.damage * damageMult;
      target.isOnFire = true;
      target.fireTimer = 5000;
      target.jellyVel.x = 8; target.jellyVel.y = 8;
      s.screenShake = 10;
      s.explosions.push({ x: target.x, y: target.y, radius: 0, maxRadius: 40, alpha: 1, time: 0 });
      addNotification(s, `💥 -${config.damage * damageMult}HP`, target.x, target.y, '#e74c3c');
      events.emit({ type: 'DRONE_HIT_STATION', x: target.x, y: target.y, data: { damage: config.damage * damageMult } });
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

    const moveSpeed = d.speed * jammerMult * realDt / 1000;
    d.x += (dx / dist) * moveSpeed * 0.03;
    d.y += (dy / dist) * moveSpeed * 0.03;
    return true;
  });
}

// ==================== SYSTEM: Crisis (Air Raids) ====================
function updateCrisis(s: GameState, realDt: number, events: EventBus): void {
  const wave = getCurrentWave(s.elapsedTime);
  const scenario = SCENARIOS[s.gameMode];
  const newWaveIdx = getCurrentWaveIndex(s.elapsedTime);
  if (newWaveIdx > s.waveIndex) {
    s.waveIndex = newWaveIdx;
    addNotification(s, `⚠ ХВИЛЯ ${newWaveIdx + 1}`, 0.5, 0.5, '#eab308');
    events.emit({ type: 'WAVE_ADVANCE', data: { wave: newWaveIdx } });
  }

  if (scenario.noRaids) return;

  if (!s.isAirRaid) {
    if (s.radarActive && s.elapsedTime > s.nextRaidTime - 5000 && s.radarWarnings.length === 0) {
      for (let i = 0; i < 3; i++) {
        const edge = Math.random();
        let wx = 0, wy = 0;
        if (edge < 0.25) { wx = 0.02; wy = Math.random(); }
        else if (edge < 0.5) { wx = 0.98; wy = Math.random(); }
        else if (edge < 0.75) { wx = Math.random(); wy = 0.02; }
        else { wx = Math.random(); wy = 0.98; }
        s.radarWarnings.push({ x: wx, y: wy, timer: 5000 });
      }
      addNotification(s, '📡 Радар: дрони наближаються!', 0.5, 0.3, '#06b6d4');
    }

    if (s.elapsedTime > s.nextRaidTime) {
      s.isAirRaid = true;
      s.airRaidTimer = 0;
      s.raidDronesSpawned = 0;
      s.radarWarnings = [];
      events.emit({ type: 'AIR_RAID_START' });
      s.surfaceVehicles.forEach(v => { v.isFrozen = true; });
    }
  } else {
    s.airRaidTimer += realDt;

    // Bridge defense mode: target bridge stations
    const bridgeOnly = s.gameMode === 'bridge_defense';

    if (s.raidDronesSpawned < wave.maxDronesPerRaid && Math.random() < realDt / wave.droneSpawnRate) {
      const activeSet = new Set(s.activeStationIds);
      let targetPool = s.stations.filter(st => !st.isDestroyed && activeSet.has(st.id));
      if (bridgeOnly) {
        const bridgeStations = targetPool.filter(st => BRIDGE_STATION_IDS.has(st.id));
        if (bridgeStations.length > 0) targetPool = bridgeStations;
      }
      const targetStation = targetPool[Math.floor(Math.random() * targetPool.length)];
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
          targetBuildingIdx: -1,
        });
        s.totalDrones++;
        s.raidDronesSpawned++;
      }
    }

    if (!scenario.continuousRaids && s.airRaidTimer > wave.raidDuration) {
      s.isAirRaid = false;
      s.nextRaidTime = s.elapsedTime + wave.calmMin + Math.random() * (wave.calmMax - wave.calmMin);
      s.drones = s.drones.filter(d => !d.isDestroyed);
      events.emit({ type: 'AIR_RAID_END' });
      s.surfaceVehicles.forEach(v => { v.isFrozen = false; });
    }

    // Continuous raids: reset spawned count periodically
    if (scenario.continuousRaids && s.raidDronesSpawned >= wave.maxDronesPerRaid) {
      s.raidDronesSpawned = 0;
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
    const scenario = SCENARIOS[s.gameMode];
    scenario.activeLines.forEach(line => {
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

// ==================== SYSTEM: Power Grid ====================
function updatePowerGrid(s: GameState, realDt: number): void {
  const scenario = SCENARIOS[s.gameMode];
  const activeCount = s.activeStationIds.length;
  const drain = activeCount * 0.003 * scenario.powerDrainMultiplier * (realDt / 1000);
  const generation = (1 + s.generators * 2) * 0.01 * (realDt / 1000);
  s.powerGrid = Math.min(s.maxPower, Math.max(0, s.powerGrid - drain + generation));

  if (s.powerGrid <= 0) {
    const openStations = s.stations.filter(st => st.isOpen && !st.isDestroyed);
    if (openStations.length > 0 && Math.random() < 0.001) {
      const victim = openStations[Math.floor(Math.random() * openStations.length)];
      victim.isOpen = false;
      addNotification(s, '⚡ Відключення!', victim.x, victim.y, '#ef4444');
    }
  }
}

// ==================== SYSTEM: Rush Hour ====================
function updateRushHour(s: GameState, realDt: number): void {
  if (s.rushHourActive) {
    s.rushHourCooldown -= realDt;
    if (s.rushHourCooldown <= 0) {
      s.rushHourActive = false;
      addNotification(s, '🕐 Година пік завершена', 0.5, 0.5, '#eab308');
    }
  } else {
    s.rushHourTimer -= realDt;
    if (s.rushHourTimer <= RUSH_HOUR_WARNING && s.rushHourTimer > RUSH_HOUR_WARNING - realDt * 2) {
      addNotification(s, '⚠️ Година пік через 5с!', 0.5, 0.5, '#f59e0b');
    }
    if (s.rushHourTimer <= 0) {
      s.rushHourActive = true;
      s.rushHourCooldown = RUSH_HOUR_DURATION;
      s.rushHourTimer = RUSH_HOUR_INTERVAL;
      addNotification(s, '🚇 ГОДИНА ПІК! x3 пасажирів!', 0.5, 0.5, '#eab308');
    }
  }
}

// ==================== SYSTEM: Combo Rewards ====================
function updateComboRewards(s: GameState): void {
  const milestones = [3, 4, 5];
  for (const m of milestones) {
    if (s.combo >= m && !s.comboMilestones.includes(m)) {
      s.comboMilestones.push(m);
      if (m === 3) {
        s.money += 30;
        addNotification(s, '🌟 Комбо x3! +30💰', 0.5, 0.4, '#f59e0b');
      } else if (m === 4) {
        s.speedBoostLine = 'red';
        s.speedBoostTimer = 5000;
        addNotification(s, '⚡ Комбо x4! Прискорення!', 0.5, 0.4, '#f59e0b');
      } else if (m === 5) {
        s.lives = Math.min(s.lives + 1, 5);
        addNotification(s, '❤️ Комбо x5! +1 життя!', 0.5, 0.4, '#f59e0b');
      }
    }
  }
  if (s.combo < 3) {
    s.comboMilestones = [];
  }
}

// ==================== SYSTEM: Phase 5 Timers ====================
function updatePhase5Timers(s: GameState, realDt: number): void {
  if (s.doubleFareTimer > 0) s.doubleFareTimer -= realDt;
  if (s.expressTimer > 0) {
    s.expressTimer -= realDt;
    if (s.expressTimer <= 0) s.expressLineId = null;
  }
  if (s.signalFlareTimer > 0) s.signalFlareTimer -= realDt;
  if (s.droneJammerTimer > 0) s.droneJammerTimer -= realDt;
  if (s.emergencyBrakeTimer > 0) s.emergencyBrakeTimer -= realDt;
  if (s.stationMagnetTimer > 0) {
    s.stationMagnetTimer -= realDt;
    if (s.stationMagnetTimer <= 0) s.stationMagnetId = null;
  }

  // Station magnet timers
  for (const st of s.stations) {
    if (st.magnetTimer > 0) st.magnetTimer -= realDt;
  }
}

// ==================== SYSTEM: Achievements ====================
function updateAchievements(s: GameState): void {
  function unlock(id: string) {
    const ach = s.achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedAt = s.elapsedTime;
      addNotification(s, `🏆 ${ach.nameUa}`, 0.5, 0.3, '#eab308');
    }
  }

  if (s.passengersDelivered >= 1) unlock('first_ride');
  if (s.passengersDelivered >= 100) unlock('hundred');
  if (s.passengersDelivered >= 1000) unlock('thousand');
  if (s.dronesIntercepted >= 10) unlock('sniper');
  if (s.elapsedTime >= 300000 && s.stationsDestroyed === 0) unlock('indestructible');
  if (s.combo >= 5) unlock('combo_master');
  if (s.money >= 500) unlock('economist');
  if (s.stationsRepaired >= 5) unlock('rescuer');

  // Three lines check
  const lines = new Set(s.trains.map(t => t.line));
  if (lines.size >= 3) unlock('three_lines');

  // Full line check
  const activeSet = new Set(s.activeStationIds);
  (['red', 'blue', 'green'] as const).forEach(line => {
    const total = LINE_STATIONS[line].length;
    const active = LINE_STATIONS[line].filter(id => activeSet.has(id)).length;
    if (active >= total) unlock('full_line');
  });
}

// ==================== SYSTEM: Win Conditions ====================
function updateWinConditions(s: GameState): void {
  const scenario = SCENARIOS[s.gameMode];
  if (!scenario.winCondition || s.winConditionMet) return;

  const wc = scenario.winCondition;
  if (wc.type === 'passengers' && s.passengersDelivered >= wc.target) {
    s.winConditionMet = true;
    addNotification(s, '🎉 ПЕРЕМОГА!', 0.5, 0.5, '#22c55e');
  }
  if (wc.type === 'survive' && s.elapsedTime >= wc.target) {
    s.winConditionMet = true;
    addNotification(s, '🎉 ВИЖИЛИ! ПЕРЕМОГА!', 0.5, 0.5, '#22c55e');
  }
  if (wc.type === 'protect' && s.elapsedTime >= wc.target) {
    // Check bridge stations are alive
    const bridgeAlive = Array.from(BRIDGE_STATION_IDS).every(id => {
      const st = getStation(s, id);
      return st && !st.isDestroyed;
    });
    if (bridgeAlive) {
      s.winConditionMet = true;
      addNotification(s, '🌉 МІСТ ЗАХИЩЕНО! ПЕРЕМОГА!', 0.5, 0.5, '#22c55e');
    }
  }

  // Time limit
  if (scenario.timeLimit && s.elapsedTime >= scenario.timeLimit && !s.winConditionMet) {
    s.gameOver = true;
  }

  // Blackout mode: lose if station destroyed
  if (s.gameMode === 'blackout' && s.stationsDestroyed > 0 && !s.winConditionMet) {
    s.gameOver = true;
  }
}

// ==================== SYSTEM: Physics / Misc ====================
function updatePhysics(s: GameState, realDt: number): void {
  for (const st of s.stations) {
    if (st.shieldTimer > 0) st.shieldTimer -= realDt;
    if (st.tunnelSealTimer > 0) st.tunnelSealTimer -= realDt;
  }

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

  s.notifications = s.notifications.filter(n => {
    n.timer -= realDt;
    n.y -= realDt * 0.00002;
    return n.timer > 0;
  });

  s.screenShake *= 0.9;
  if (s.screenShake < 0.5) s.screenShake = 0;

  s.explosions = s.explosions.filter(e => {
    e.time += realDt;
    e.radius = e.maxRadius * Math.min(1, e.time / 500);
    e.alpha = Math.max(0, 1 - e.time / 1000);
    return e.alpha > 0;
  });

  if (s.speedBoostTimer > 0) {
    s.speedBoostTimer -= realDt;
    if (s.speedBoostTimer <= 0) {
      s.speedBoostLine = null;
    }
  }
  if (s.speedBoostCooldown > 0) s.speedBoostCooldown -= realDt;

  s.decoys = s.decoys.filter(d => {
    d.timer -= realDt;
    return d.timer > 0 && d.hp > 0;
  });

  s.radarWarnings = s.radarWarnings.filter(w => {
    w.timer -= realDt;
    return w.timer > 0;
  });

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

  const totalCap = s.trains.reduce((sum, t) => sum + t.capacity, 0);
  const totalUsed = s.trains.reduce((sum, t) => sum + t.passengers.length, 0);
  s.networkEfficiency = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;

  // Permanent night for blackout mode
  if (SCENARIOS[s.gameMode].permanentNight) {
    s.isNight = true;
    s.dayTime = 0.1;
  }
}

// ==================== MAIN UPDATE ====================
export const globalEventBus = new EventBus();

export function updateGame(state: GameState, dt: number, audio: AudioEngine): GameState {
  if (!state.gameStarted || state.gameOver || state.isPaused) return state;

  const realDt = dt * state.speedMultiplier;
  const s = { ...state };
  s.elapsedTime += realDt;
  s.modeTimer += realDt;

  s.dayTime = (s.dayTime + realDt / GAME_CONFIG.DAY_CYCLE_DURATION) % 1;
  s.isNight = s.dayTime < 0.2 || s.dayTime > 0.8;

  const activeSet = new Set(s.activeStationIds);
  s._cachedLineStations = {
    red: LINE_STATIONS.red.filter(id => activeSet.has(id)),
    blue: LINE_STATIONS.blue.filter(id => activeSet.has(id)),
    green: LINE_STATIONS.green.filter(id => activeSet.has(id)),
  };

  updateProgression(s, realDt, globalEventBus);
  updatePassengers(s, realDt, globalEventBus);
  updateTrains(s, realDt, globalEventBus);
  updateCrisis(s, realDt, globalEventBus);
  updateDrones(s, realDt, globalEventBus);
  updateRepair(s, realDt, globalEventBus);
  updatePowerGrid(s, realDt);
  updateRushHour(s, realDt);
  updateComboRewards(s);
  updatePhase5Timers(s, realDt);
  updateAchievements(s);
  updateWinConditions(s);
  updatePhysics(s, realDt);

  globalEventBus.flush();

  return s;
}

// ===== Click-to-select/attack drone =====
export function attackDrone(state: GameState, droneId: string): GameState {
  state.selectedDroneId = droneId;
  if (state.money < 5) return state;
  const drone = state.drones.find(d => d.id === droneId && !d.isDestroyed);
  if (!drone) return state;
  state.money -= 5;
  drone.hp--;
  if (drone.hp <= 0) {
    drone.isDestroyed = true;
    state.dronesIntercepted++;
    state.score += Math.round(10 * state.combo);
    state.money += 15;
    state.explosions.push({ x: drone.x, y: drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
    addNotification(state, `🎯 +${Math.round(10 * state.combo)}`, drone.x, drone.y, '#f1c40f');
    globalEventBus.emit({ type: 'DRONE_DESTROYED', x: drone.x, y: drone.y });
    state.selectedDroneId = null;
  } else {
    addNotification(state, `💥 ${drone.hp}/${drone.maxHp}`, drone.x, drone.y, '#e67e22');
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

// ===== Phase 4 Actions =====
export function buyGenerator(state: GameState): GameState {
  if (state.money < GAME_CONFIG.GENERATOR_COST) return state;
  state.money -= GAME_CONFIG.GENERATOR_COST;
  state.generators++;
  state.maxPower += 30;
  state.powerGrid = Math.min(state.powerGrid + 30, state.maxPower);
  addNotification(state, '⚡ Генератор!', 0.5, 0.5, '#22c55e');
  return state;
}

export function buyRadar(state: GameState): GameState {
  if (state.money < GAME_CONFIG.RADAR_COST || state.radarActive) return state;
  state.money -= GAME_CONFIG.RADAR_COST;
  state.radarActive = true;
  addNotification(state, '📡 Радар активовано!', 0.5, 0.5, '#06b6d4');
  return state;
}

export function placeDecoy(state: GameState): GameState {
  if (state.money < GAME_CONFIG.DECOY_COST) return state;
  state.money -= GAME_CONFIG.DECOY_COST;
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.15 + Math.random() * 0.2;
  state.decoys.push({
    id: uid(),
    x: 0.5 + Math.cos(angle) * dist,
    y: 0.5 + Math.sin(angle) * dist,
    timer: 20000, hp: 1,
  });
  addNotification(state, '🎯 Приманку розміщено!', 0.5, 0.5, '#f59e0b');
  return state;
}

export function emergencySpeedBoost(state: GameState, line: 'red' | 'blue' | 'green'): GameState {
  if (state.money < GAME_CONFIG.SPEED_BOOST_COST || state.speedBoostCooldown > 0) return state;
  state.money -= GAME_CONFIG.SPEED_BOOST_COST;
  state.speedBoostLine = line;
  state.speedBoostTimer = 10000;
  state.speedBoostCooldown = 30000;
  addNotification(state, `⚡ ${line.toUpperCase()} x2 швидкість!`, 0.5, 0.5, '#a855f7');
  return state;
}

export function toggleShelter(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.depth !== 'deep') return state;
  station.isSheltering = !station.isSheltering;
  return state;
}

export function sealTunnel(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || state.money < GAME_CONFIG.TUNNEL_SEAL_COST) return state;
  state.money -= GAME_CONFIG.TUNNEL_SEAL_COST;
  station.tunnelSealTimer = 15000;
  addNotification(state, '🚧 Тунель заблоковано!', station.x, station.y, '#9ca3af');
  return state;
}

// ===== Phase 5 Actions =====
export function emergencyBrake(state: GameState): GameState {
  if (state.money < GAME_CONFIG.EMERGENCY_BRAKE_COST || state.emergencyBrakeTimer > 0) return state;
  state.money -= GAME_CONFIG.EMERGENCY_BRAKE_COST;
  state.emergencyBrakeTimer = 5000;
  addNotification(state, '🛑 Екстренне гальмування!', 0.5, 0.5, '#ef4444');
  return state;
}

export function activateDoubleFare(state: GameState): GameState {
  if (state.money < GAME_CONFIG.DOUBLE_FARE_COST || state.doubleFareTimer > 0) return state;
  state.money -= GAME_CONFIG.DOUBLE_FARE_COST;
  state.doubleFareTimer = 15000;
  addNotification(state, '💰 Подвійний тариф! x2 очки!', 0.5, 0.5, '#22c55e');
  return state;
}

export function activateExpressLine(state: GameState, line: 'red' | 'blue' | 'green'): GameState {
  if (state.money < GAME_CONFIG.EXPRESS_LINE_COST || state.expressTimer > 0) return state;
  state.money -= GAME_CONFIG.EXPRESS_LINE_COST;
  state.expressLineId = line;
  state.expressTimer = 20000;
  addNotification(state, `🚄 Експрес ${line.toUpperCase()}! x3 швидкість!`, 0.5, 0.5, '#3b82f6');
  return state;
}

export function toggleBlackout(state: GameState): GameState {
  state.blackoutMode = !state.blackoutMode;
  addNotification(state, state.blackoutMode ? '🌑 Блекаут: дрони промахуються частіше' : '💡 Світло увімкнено', 0.5, 0.5, '#9ca3af');
  return state;
}

export function activateSignalFlare(state: GameState): GameState {
  if (state.money < GAME_CONFIG.SIGNAL_FLARE_COST || state.signalFlareTimer > 0) return state;
  state.money -= GAME_CONFIG.SIGNAL_FLARE_COST;
  state.signalFlareTimer = 10000;
  addNotification(state, '🔦 Сигнальна ракета! Цілі дронів видно!', 0.5, 0.5, '#f59e0b');
  return state;
}

export function passengerAirdrop(state: GameState): GameState {
  if (state.money < GAME_CONFIG.PASSENGER_AIRDROP_COST) return state;
  state.money -= GAME_CONFIG.PASSENGER_AIRDROP_COST;
  const activeSet = new Set(state.activeStationIds);
  const shapes: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
  const activeShapes = new Set<PassengerShape>();
  for (const st of state.stations) {
    if (activeSet.has(st.id) && !st.isDestroyed) activeShapes.add(st.shape);
  }
  const availShapes = Array.from(activeShapes);

  for (const st of state.stations) {
    if (!activeSet.has(st.id) || st.isDestroyed || !st.isOpen) continue;
    if (st.passengers.length >= st.maxPassengers) continue;
    for (let i = 0; i < 3 && st.passengers.length < st.maxPassengers; i++) {
      const possibleShapes = availShapes.filter(sh => sh !== st.shape);
      if (possibleShapes.length > 0) {
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        st.passengers.push({ id: uid(), shape, spawnTime: state.elapsedTime, stationId: st.id, patience: 20000 });
      }
    }
  }
  addNotification(state, '🪂 Пасажирів висаджено!', 0.5, 0.5, '#8b5cf6');
  return state;
}

export function mergeTrains(state: GameState, trainId1: string, trainId2: string): GameState {
  const t1 = state.trains.find(t => t.id === trainId1);
  const t2 = state.trains.find(t => t.id === trainId2);
  if (!t1 || !t2 || t1.line !== t2.line) return state;
  t1.capacity += t2.capacity;
  t1.passengers.push(...t2.passengers);
  t1.level = Math.max(t1.level, t2.level);
  state.trains = state.trains.filter(t => t.id !== trainId2);
  addNotification(state, '🔗 Потяги об\'єднані!', t1.x, t1.y, '#a855f7');
  return state;
}

export function activateStationMagnet(state: GameState, stationId: string): GameState {
  if (state.money < GAME_CONFIG.STATION_MAGNET_COST || state.stationMagnetTimer > 0) return state;
  state.money -= GAME_CONFIG.STATION_MAGNET_COST;
  state.stationMagnetId = stationId;
  state.stationMagnetTimer = 20000;
  const st = getStation(state, stationId);
  addNotification(state, `🧲 Магніт: ${st?.nameUa}`, 0.5, 0.5, '#ec4899');
  return state;
}

export function activateDroneJammer(state: GameState): GameState {
  if (state.money < GAME_CONFIG.DRONE_JAMMER_COST || state.droneJammerTimer > 0) return state;
  state.money -= GAME_CONFIG.DRONE_JAMMER_COST;
  state.droneJammerTimer = 15000;
  addNotification(state, '📡 Глушилка! Дрони -50% швидкість!', 0.5, 0.5, '#06b6d4');
  return state;
}

export function emergencyFund(state: GameState): GameState {
  if (state.lives <= 1) return state;
  state.lives--;
  state.money += 80;
  addNotification(state, '💔 -1 ❤️ → +80💰', 0.5, 0.5, '#ef4444');
  return state;
}

// Keep for backward compat
export function handleQteInput(state: GameState, key: string, audio: AudioEngine): GameState {
  return state;
}
