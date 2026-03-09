import { STATIONS, STATION_MAP, LINE_STATIONS, GAME_CONFIG, SURFACE_ROUTES, PassengerShape, DRONE_TYPES, BRIDGE_STATION_IDS, getStationsForCity, getStationMapForCity, getLineStationsForCity, getBridgeStationsForCity, getSurfaceRoutesForCity, getCityLines } from './constants';
import { GameState, GameStation, Train, Drone, Passenger, RepairUnit, DroneType, GameNotification, BuildingState, Decoy, GameMode, Achievement, InterceptorDrone, TracerLine, CityState, IntercityTrain } from './types';
import { AudioEngine } from './AudioEngine';
import { EventBus } from './core/EventBus';
import { getCurrentWave, getCurrentWaveIndex, PATIENCE_BASE, PATIENCE_MIN, PATIENCE_DECAY_PER_WAVE } from './config/difficulty';
import { generateBuildingData } from './components/CityBuildings';
import { SCENARIOS, ACHIEVEMENT_DEFS } from './config/scenarios';
import { CITIES, getCityConfig } from './config/cities';

let nextId = 0;
const uid = () => `${++nextId}`;

const STATION_IDX = new Map<string, number>(STATIONS.map((s, i) => [s.id, i]));
export function getStation(state: GameState, id: string) {
  const idx = STATION_IDX.get(id);
  return idx !== undefined ? state.stations[idx] : undefined;
}

const SHAPES: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
const STARTING_STATIONS = ['r10', 'r11', 'b7', 'b8', 'g4', 'g5']; // Legacy default

const UNLOCK_ORDER: Record<string, string[]> = {
  red: ['r9', 'r12', 'r8', 'r13', 'r7', 'r14', 'r6', 'r15', 'r5', 'r16', 'r4', 'r17', 'r3', 'r18', 'r2', 'r1'],
  blue: ['b6', 'b9', 'b5', 'b10', 'b4', 'b11', 'b3', 'b12', 'b2', 'b13', 'b1', 'b14', 'b15', 'b16'],
  green: ['g3', 'g6', 'g2', 'g7', 'g1', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15'],
};

const STATION_UNLOCK_INTERVAL = 45000; // Slower pacing
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

export function createInitialState(mode: GameMode = 'classic', cityId: string = 'kyiv'): GameState {
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
    isFortified: false, empCooldown: 0, panicTimer: 0, passiveIncomeAccum: 0,
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
        x: st.x, y: st.y, dwellTimer: 0, isDwelling: false, level: 1, shieldTimer: 0,
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
        x: st.x, y: st.y, dwellTimer: 0, isDwelling: false, level: 1, shieldTimer: 0,
      });
    }
    trainsCreated++;
  }

  return {
    stations, trains, drones: [], surfaceVehicles: [], explosions: [], repairUnits: [],
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, targetX: 0, targetY: 0, mode: 'free' as const, orbitAngle: 0, orbitSpeed: 0.3, tiltAngle: 0.55, keysDown: new Set<string>() },
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
    // Phase 7
    floatingScores: [],
    killFlashTimer: 0,
    screenPulseTimer: 0,
    screenPulseColor: '#22c55e',
    passiveIncomeTimer: 0,
    victoryLapActive: false,
    swarmWarningTimer: 0,
    // Phase 17
    closedSegments: [],
    // Phase 18
    activeEvents: [],
    hoveredElement: null,
    eventLog: [],
    // Phase 20
    pendingStations: [],
    isDrawingLine: false,
    drawLineFrom: null,
    drawLineTo: null,
    drawLineColor: null,
    drawMouseWorldPos: null,
    trainSpawnEffects: [],
    _cachedLineStations: {},
    // Multi-city
    currentCity: cityId,
    cityStates: Object.fromEntries(Object.keys(CITIES).map(cid => [cid, {
      cityId: cid,
      stability: 50,
      avgSatisfaction: 100,
      buildingsManaged: 0,
    } as CityState])),
    intercityTrains: [],
    globalStability: 50,
    // Tutorial
    tutorialStep: 0,
    tutorialComplete: false,
    // Building upgrades
    buildingUpgrades: {},
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

    // Check closed segments
    const nextStationId = route[nextIdx];
    const curStationId = route[t.routeIndex];
    const isSegmentClosed = s.closedSegments.some(seg =>
      seg.line === t.line &&
      ((seg.from === curStationId && seg.to === nextStationId) ||
       (seg.from === nextStationId && seg.to === curStationId))
    );
    if (isSegmentClosed) {
      t.direction = (t.direction * -1) as 1 | -1;
      t.isDwelling = true;
      t.dwellTimer = GAME_CONFIG.DWELL_TIME;
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
            // VIP delivery bonus: 5x score for VIP passengers
            const vipCount = matching.filter(p => p.isVIP).length;
            const vipBonus = vipCount * 4; // extra 4x on top of normal 1x
            const earned = Math.round((matching.length + vipBonus) * s.combo * fareMult);
            s.score += earned;
            s.money += Math.round(earned * 0.5);
            s.passengersDelivered += matching.length;
            s.combo = Math.min(Math.round((s.combo + 0.2) * 10) / 10, 5);
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            t.passengers = t.passengers.filter(p => p.shape !== arrStation.shape);
            const vipText = vipCount > 0 ? ` ⭐VIP!` : '';
            addNotification(s, `+${earned}${vipText}`, arrStation.x, arrStation.y, vipCount > 0 ? '#fbbf24' : '#2ecc71');
            events.emit({ type: 'PASSENGER_DELIVERED', x: arrStation.x, y: arrStation.y, data: { count: matching.length } });
            if (vipCount > 0) {
              s.floatingScores.push({ id: uid(), text: `VIP +${earned}`, x: 50, y: 35, color: '#fbbf24', timer: 2000, scale: 1.5 });
              s.screenPulseTimer = 600;
              s.screenPulseColor = '#fbbf24';
            }
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

      // 70% chance to hit a building instead (buildings-first targeting)
      if (d.targetBuildingIdx === -1 && Math.random() < 0.7 && s.buildings.length > 0) {
        let nearestBldg = -1;
        let nearestDist = Infinity;
        for (let bi = 0; bi < s.buildings.length; bi++) {
          const b = s.buildings[bi];
          if (b.isDestroyed) continue;
          const bdx = b.x - d.x, bdy = b.y - d.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bdist < nearestDist) { nearestDist = bdist; nearestBldg = bi; }
        }
        if (nearestBldg >= 0 && nearestDist < 0.15) {
          const bldg = s.buildings[nearestBldg];
          bldg.hp -= config.damage;
          s.explosions.push({ x: bldg.x, y: bldg.y, radius: 0, maxRadius: 50, alpha: 1, time: 0 });
          if (bldg.hp <= 0) {
            bldg.isDestroyed = true;
            bldg.hp = 0;
            s.buildingsDestroyed++;
            addNotification(s, '🏚️💥', bldg.x, bldg.y, '#ff6600');
          }
          s.screenShake = 8;
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

    // Stunned drones don't move
    if (d.isStunned) {
      d.stunTimer -= realDt;
      if (d.stunTimer <= 0) { d.isStunned = false; }
      return true;
    }

    // Rain slows drones
    const rainMult = s.isRaining ? 0.8 : 1;
    const moveSpeed = d.speed * jammerMult * rainMult * realDt / 1000;
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

      // VIP drone targeting: 40% chance to target station with VIP passenger
      let targetStation: GameStation | undefined;
      const vipStations = targetPool.filter(st => st.passengers.some(p => p.isVIP));
      if (vipStations.length > 0 && Math.random() < 0.4) {
        targetStation = vipStations[Math.floor(Math.random() * vipStations.length)];
      } else {
        targetStation = targetPool[Math.floor(Math.random() * targetPool.length)];
      }

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
          targetBuildingIdx: -1, isStunned: false, stunTimer: 0,
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
      const nextStation = order.find(id => !s.activeStationIds.includes(id) && !s.pendingStations.includes(id));
      if (nextStation) {
        s.pendingStations.push(nextStation);
        const st = getStation(s, nextStation);
        if (st) { st.jellyVel.y = -4; st.jellyVel.x = 2; }
        addNotification(s, '🔗 Нова станція! Проведи лінію!', st?.x || 0.5, st?.y || 0.5, '#9ca3af');
        events.emit({ type: 'STATION_UNLOCKED', data: { stationId: nextStation } });
      }
    });
  }

  // Pending stations also spawn passengers (pressure!)
  const pendingSet = new Set(s.pendingStations);
  for (const st of s.stations) {
    if (!pendingSet.has(st.id) || st.isDestroyed) continue;
    // Overflow on pending stations causes life loss
    if (st.passengers.length > st.maxPassengers + 2) {
      s.lives--;
      st.passengers.splice(0, 3);
      st.jellyVel.x = 5; st.jellyVel.y = 5;
      addNotification(s, '💀 Станція переповнена!', st.x, st.y, '#ef4444');
      if (s.lives <= 0) s.gameOver = true;
    }
  }

  // Spawn passengers on pending stations (slower rate)
  if (s.pendingStations.length > 0 && Math.random() < realDt / 8000) {
    const pendingStations = s.stations.filter(st => pendingSet.has(st.id) && !st.isDestroyed && st.passengers.length < st.maxPassengers);
    if (pendingStations.length > 0) {
      const st = pendingStations[Math.floor(Math.random() * pendingStations.length)];
      const shapes: PassengerShape[] = ['circle', 'square', 'triangle', 'diamond'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      st.passengers.push({ id: uid(), shape, spawnTime: s.elapsedTime, stationId: st.id, patience: 25000 });
    }
  }

  // Train spawn effects decay
  s.trainSpawnEffects = s.trainSpawnEffects.filter(e => {
    e.timer -= realDt;
    return e.timer > 0;
  });
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

// ==================== SYSTEM: Phase 6 (Interceptors, SAM, Weather, Auto-repair) ====================
function updatePhase6Systems(s: GameState, realDt: number, events: EventBus): void {
  // --- Interceptor drones chase enemy drones ---
  s.interceptorDrones = s.interceptorDrones.filter(iDrone => {
    const target = s.drones.find(d => d.id === iDrone.targetDroneId && !d.isDestroyed);
    if (!target) return false;
    const dx = target.x - iDrone.x, dy = target.y - iDrone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.015) {
      target.hp -= 2;
      if (target.hp <= 0) {
        target.isDestroyed = true;
        s.dronesIntercepted++;
        s.score += 20;
        s.money += 12;
        s.explosions.push({ x: target.x, y: target.y, radius: 0, maxRadius: 30, alpha: 1, time: 0 });
        events.emit({ type: 'DRONE_DESTROYED', x: target.x, y: target.y });
        addNotification(s, '🛩️ Перехоплення!', target.x, target.y, '#22c55e');
      }
      return false;
    }
    const moveSpeed = iDrone.speed * realDt / 1000;
    iDrone.x += (dx / dist) * moveSpeed * 0.05;
    iDrone.y += (dy / dist) * moveSpeed * 0.05;
    return true;
  });

  // --- SAM Battery auto-fire ---
  for (const st of s.stations) {
    if (!st.hasSAM || st.isDestroyed) continue;
    if (st.samCooldown > 0) { st.samCooldown -= realDt; continue; }
    const nearestDrone = s.drones.filter(d => !d.isDestroyed).reduce((best, d) => {
      const dx = st.x - d.x, dy = st.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.2 && (!best || dist < best.dist)) return { drone: d, dist };
      return best;
    }, null as { drone: Drone; dist: number } | null);
    if (nearestDrone) {
      nearestDrone.drone.hp--;
      st.samCooldown = 2000;
      s.tracerLines.push({
        id: uid(), fromX: st.x, fromY: st.y,
        toX: nearestDrone.drone.x, toY: nearestDrone.drone.y,
        timer: 500, color: '#00ff88',
      });
      addNotification(s, '🚀', nearestDrone.drone.x, nearestDrone.drone.y, '#22c55e');
      if (nearestDrone.drone.hp <= 0) {
        nearestDrone.drone.isDestroyed = true;
        s.dronesIntercepted++;
        s.score += 15;
        s.money += 10;
        s.explosions.push({ x: nearestDrone.drone.x, y: nearestDrone.drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
        events.emit({ type: 'DRONE_DESTROYED', x: nearestDrone.drone.x, y: nearestDrone.drone.y });
      }
    }
  }

  // --- AA Turret fast fire ---
  for (const st of s.stations) {
    if (!st.hasAATurret || st.isDestroyed) continue;
    if (st.turretCooldown > 0) { st.turretCooldown -= realDt; continue; }
    const nearestDrone = s.drones.filter(d => !d.isDestroyed).reduce((best, d) => {
      const dx = st.x - d.x, dy = st.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1 && (!best || dist < best.dist)) return { drone: d, dist };
      return best;
    }, null as { drone: Drone; dist: number } | null);
    if (nearestDrone) {
      nearestDrone.drone.hp--;
      st.turretCooldown = 1000;
      s.tracerLines.push({
        id: uid(), fromX: st.x, fromY: st.y,
        toX: nearestDrone.drone.x, toY: nearestDrone.drone.y,
        timer: 300, color: '#ffaa00',
      });
      if (nearestDrone.drone.hp <= 0) {
        nearestDrone.drone.isDestroyed = true;
        s.dronesIntercepted++;
        s.score += 10;
        s.money += 8;
        s.explosions.push({ x: nearestDrone.drone.x, y: nearestDrone.drone.y, radius: 0, maxRadius: 20, alpha: 1, time: 0 });
        events.emit({ type: 'DRONE_DESTROYED', x: nearestDrone.drone.x, y: nearestDrone.drone.y });
      }
    }
  }

  // --- Tracer lines decay ---
  s.tracerLines = s.tracerLines.filter(t => {
    t.timer -= realDt;
    return t.timer > 0;
  });

  // --- Weather system ---
  s.weatherTimer -= realDt;
  if (s.weatherTimer <= 0) {
    s.isRaining = !s.isRaining;
    s.weatherTimer = s.isRaining ? (15000 + Math.random() * 30000) : (30000 + Math.random() * 60000);
    if (s.isRaining) {
      addNotification(s, '🌧️ Дощ: дрони -20% швидкість', 0.5, 0.3, '#6b7280');
    }
  }

  // --- Auto-repair: stations regenerate 1 HP/5s when not under attack ---
  s.autoRepairTimer += realDt;
  if (s.autoRepairTimer >= 5000) {
    s.autoRepairTimer = 0;
    const activeSet = new Set(s.activeStationIds);
    for (const st of s.stations) {
      if (!activeSet.has(st.id) || st.isDestroyed || st.isOnFire) continue;
      if (st.hp < st.maxHp) {
        st.hp = Math.min(st.maxHp, st.hp + 1);
      }
    }
  }
}

// ==================== SYSTEM: Phase 7 ====================
function updatePhase7Systems(s: GameState, realDt: number): void {
  s.passiveIncomeTimer += realDt;
  if (s.passiveIncomeTimer >= 10000) {
    s.passiveIncomeTimer = 0;
    const activeSet = new Set(s.activeStationIds);
    const activeCount = s.stations.filter(st => activeSet.has(st.id) && !st.isDestroyed).length;
    s.money += activeCount;
  }
  for (const t of s.trains) { if (t.shieldTimer > 0) t.shieldTimer -= realDt; }
  for (const st of s.stations) {
    if (st.empCooldown > 0) st.empCooldown -= realDt;
    if (st.panicTimer > 0) st.panicTimer -= realDt;
  }
  if (s.killFlashTimer > 0) s.killFlashTimer -= realDt;
  if (s.screenPulseTimer > 0) s.screenPulseTimer -= realDt;
  if (s.swarmWarningTimer > 0) s.swarmWarningTimer -= realDt;
  s.floatingScores = s.floatingScores.filter(fs => { fs.timer -= realDt; fs.y -= realDt * 0.003; return fs.timer > 0; });
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

  // Closed segments decay
  s.closedSegments = s.closedSegments.filter(seg => {
    seg.timer -= realDt;
    return seg.timer > 0;
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
  updatePhase6Systems(s, realDt, globalEventBus);
  updatePhase7Systems(s, realDt);
  updateGameEvents(s, realDt, globalEventBus);
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
    const earned = Math.round(10 * state.combo);
    state.score += earned;
    state.money += 15;
    state.explosions.push({ x: drone.x, y: drone.y, radius: 0, maxRadius: 25, alpha: 1, time: 0 });
    addNotification(state, `🎯 +${earned}`, drone.x, drone.y, '#f1c40f');
    state.killFlashTimer = 300;
    state.floatingScores.push({ id: uid(), text: `+${earned}`, x: 50, y: 40, color: '#fbbf24', timer: 1500, scale: 1.2 });
    // Critical hit chance
    if (Math.random() < 0.1) {
      state.score += earned;
      state.floatingScores.push({ id: uid(), text: 'КРИТ!', x: 52, y: 35, color: '#ef4444', timer: 1200, scale: 1.5 });
    }
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

export function purchaseTrain(state: GameState, line: string): GameState {
  if (state.money < GAME_CONFIG.TRAIN_COST) return state;
  const route = getActiveLineStations(state, line);
  if (route.length < 2) return state;
  const startStation = getStation(state, route[0]);
  if (!startStation) return state;
  state.money -= GAME_CONFIG.TRAIN_COST;
  const newTrain = {
    id: uid(), line, routeIndex: 0, progress: 0, direction: 1 as const,
    speed: GAME_CONFIG.TRAIN_SPEED, passengers: [] as Passenger[], capacity: GAME_CONFIG.TRAIN_CAPACITY,
    x: startStation.x, y: startStation.y, dwellTimer: 0, isDwelling: false, level: 1, shieldTimer: 0,
  };
  state.trains.push(newTrain);
  // Spawn effect
  state.trainSpawnEffects.push({ id: newTrain.id, x: startStation.x, y: startStation.y, timer: 1500, line });
  addNotification(state, '🚇 Новий потяг!', startStation.x, startStation.y, '#4ade80');
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

export function rerouteTrain(state: GameState, trainId: string, newLine: string): GameState {
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

export function emergencySpeedBoost(state: GameState, line: string): GameState {
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

export function activateExpressLine(state: GameState, line: string): GameState {
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

// ===== Phase 6 Actions =====
export function buySAMBattery(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.hasSAM || state.money < GAME_CONFIG.SAM_BATTERY_COST) return state;
  state.money -= GAME_CONFIG.SAM_BATTERY_COST;
  station.hasSAM = true;
  addNotification(state, '🚀 ЗРК встановлено!', station.x, station.y, '#22c55e');
  return state;
}

export function buyAATurret(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.hasAATurret || state.money < GAME_CONFIG.AA_TURRET_COST) return state;
  state.money -= GAME_CONFIG.AA_TURRET_COST;
  station.hasAATurret = true;
  addNotification(state, '🔫 Турель встановлено!', station.x, station.y, '#f59e0b');
  return state;
}

export function launchInterceptor(state: GameState, stationId: string): GameState {
  if (state.money < GAME_CONFIG.INTERCEPTOR_COST) return state;
  const station = getStation(state, stationId);
  if (!station) return state;
  const nearestDrone = state.drones.filter(d => !d.isDestroyed).reduce((best, d) => {
    const dx = station.x - d.x, dy = station.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!best || dist < best.dist) return { drone: d, dist };
    return best;
  }, null as { drone: Drone; dist: number } | null);
  if (!nearestDrone) return state;
  state.money -= GAME_CONFIG.INTERCEPTOR_COST;
  state.interceptorDrones.push({
    id: uid(), x: station.x, y: station.y,
    targetDroneId: nearestDrone.drone.id, speed: 2.5,
    sourceStationId: stationId,
  });
  addNotification(state, '🛩️ Перехоплювач запущено!', station.x, station.y, '#22c55e');
  return state;
}

// ===== Phase 7 Actions =====
export function fortifyStation(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || station.isFortified || state.money < 100) return state;
  state.money -= 100;
  station.isFortified = true;
  station.maxHp *= 2;
  station.hp = station.maxHp;
  addNotification(state, '🏰 Укріплено!', station.x, station.y, '#9ca3af');
  return state;
}

export function activateDroneEMP(state: GameState, stationId: string): GameState {
  const station = getStation(state, stationId);
  if (!station || state.money < 60 || station.empCooldown > 0) return state;
  state.money -= 60;
  station.empCooldown = 45000;
  let stunned = 0;
  for (const d of state.drones) {
    if (d.isDestroyed) continue;
    const dx = station.x - d.x, dy = station.y - d.y;
    if (Math.sqrt(dx * dx + dy * dy) < 0.15) {
      d.isStunned = true;
      d.stunTimer = 3000;
      stunned++;
    }
  }
  addNotification(state, `⚡ ЕМІ! ${stunned} дронів оглушено!`, station.x, station.y, '#a855f7');
  return state;
}

export function activateTrainShield(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (!train || state.money < 30 || train.shieldTimer > 0) return state;
  state.money -= 30;
  train.shieldTimer = 15000;
  addNotification(state, '🛡️ Щит потяга!', train.x, train.y, '#3b82f6');
  return state;
}

// ===== Phase 17: Line Management =====
export function sellTrain(state: GameState, trainId: string): GameState {
  const train = state.trains.find(t => t.id === trainId);
  if (!train) return state;
  // Dump passengers at nearest station
  const activeSet = new Set(state.activeStationIds);
  const nearestStation = state.stations
    .filter(s => activeSet.has(s.id) && !s.isDestroyed && s.isOpen)
    .sort((a, b) => {
      const da = Math.abs(a.x - train.x) + Math.abs(a.y - train.y);
      const db = Math.abs(b.x - train.x) + Math.abs(b.y - train.y);
      return da - db;
    })[0];
  if (nearestStation) {
    for (const p of train.passengers) {
      if (nearestStation.passengers.length < nearestStation.maxPassengers) {
        nearestStation.passengers.push({ ...p, stationId: nearestStation.id });
      }
    }
  }
  state.trains = state.trains.filter(t => t.id !== trainId);
  state.money += 25;
  state.selectedTrain = null;
  addNotification(state, '💰 Потяг продано +$25', train.x, train.y, '#4ade80');
  return state;
}

export function closeLineSegment(state: GameState, line: string, from: string, to: string): GameState {
  if (state.money < 15) return state;
  // Don't close if already closed
  if (state.closedSegments.some(s => s.line === line && s.from === from && s.to === to)) return state;
  state.money -= 15;
  state.closedSegments.push({ line, from, to, timer: 30000 });
  addNotification(state, '🚧 Сегмент закрито!', 0.5, 0.5, '#f59e0b');
  return state;
}

export function reopenLineSegment(state: GameState, line: string): GameState {
  state.closedSegments = state.closedSegments.filter(s => s.line !== line);
  addNotification(state, '✅ Лінію відкрито!', 0.5, 0.5, '#22c55e');
  return state;
}

// Keep for backward compat
export function handleQteInput(state: GameState, key: string, audio: AudioEngine): GameState {
  return state;
}

// ===== Phase 18: Dynamic Events & Building Repair =====
export function repairBuilding(state: GameState, buildingIdx: number): GameState {
  if (state.money < 10) return state;
  const b = state.buildings[buildingIdx];
  if (!b || b.isDestroyed || b.hp >= b.maxHp) return state;
  state.money -= 10;
  b.hp = Math.min(b.maxHp, b.hp + 25);
  addNotification(state, '🔧 +25HP', b.x, b.y, '#4ade80');
  return state;
}

// ===== Phase 20: Connect pending station =====

// Get end stations (first and last active) for a given line
export function getLineEndStations(state: GameState, line: string): string[] {
  const lineIds = LINE_STATIONS[line];
  if (!lineIds) return [];
  const activeSet = new Set(state.activeStationIds);
  const activeOnLine = lineIds.filter(id => activeSet.has(id));
  if (activeOnLine.length === 0) return [];
  const ends: string[] = [];
  if (activeOnLine.length === 1) return [activeOnLine[0]];
  ends.push(activeOnLine[0], activeOnLine[activeOnLine.length - 1]);
  return ends;
}

// Check if a station is an end station on any line
export function isEndStation(state: GameState, stationId: string): { isEnd: boolean; line: string | null } {
  for (const line of ['red', 'blue', 'green']) {
    const ends = getLineEndStations(state, line);
    if (ends.includes(stationId)) return { isEnd: true, line };
  }
  return { isEnd: false, line: null };
}

// Get which pending station can be connected from a given end station
// Cross-line: any end station can connect to ANY pending station regardless of line
export function getValidPendingTargets(state: GameState, fromStationId: string): string[] {
  const { isEnd } = isEndStation(state, fromStationId);
  if (!isEnd) return [];
  
  // Return ALL pending stations — no line restriction
  // Sort by distance to the source station for UX (closest first)
  const fromSt = STATION_MAP.get(fromStationId);
  if (!fromSt) return [...state.pendingStations];
  
  return [...state.pendingStations].sort((a, b) => {
    const sa = STATION_MAP.get(a);
    const sb = STATION_MAP.get(b);
    if (!sa || !sb) return 0;
    const da = Math.hypot(sa.x - fromSt.x, sa.y - fromSt.y);
    const db = Math.hypot(sb.x - fromSt.x, sb.y - fromSt.y);
    return da - db;
  });
}

export function connectStation(state: GameState, pendingStationId: string, fromStationId: string): GameState {
  if (!state.pendingStations.includes(pendingStationId)) return state;
  if (!state.activeStationIds.includes(fromStationId)) return state;
  
  // Validate: fromStation must be an end station, target must be pending
  const { isEnd } = isEndStation(state, fromStationId);
  if (!isEnd) return state;
  
  state.pendingStations = state.pendingStations.filter(id => id !== pendingStationId);
  state.activeStationIds.push(pendingStationId);
  const st = getStation(state, pendingStationId);
  const pendingSt = STATION_MAP.get(pendingStationId);
  const lineName = pendingSt ? (pendingSt.line === 'red' ? 'M1' : pendingSt.line === 'blue' ? 'M2' : 'M3') : '';
  if (st) {
    st.jellyVel.y = -8; st.jellyVel.x = 5;
    addNotification(state, `✅ Підключено до ${lineName}!`, st.x, st.y, '#4ade80');
  }
  // Recache
  const activeSet = new Set(state.activeStationIds);
  state._cachedLineStations = {
    red: LINE_STATIONS.red.filter(id => activeSet.has(id)),
    blue: LINE_STATIONS.blue.filter(id => activeSet.has(id)),
    green: LINE_STATIONS.green.filter(id => activeSet.has(id)),
  };
  state.isDrawingLine = false;
  state.drawLineFrom = null;
  state.drawLineTo = null;
  state.drawLineColor = null;
  state.drawMouseWorldPos = null;
  return state;
}

function updateGameEvents(s: GameState, realDt: number, events: EventBus): void {
  // Decay active events
  s.activeEvents = s.activeEvents.filter(ev => {
    ev.timer -= realDt;
    return ev.timer > 0;
  });

  // Random event spawner — every 45-90s
  const shouldSpawn = s.elapsedTime > 30000 && s.activeEvents.length < 2 && Math.random() < realDt / 60000;
  if (shouldSpawn) {
    const roll = Math.random();
    let nextId = `evt_${Date.now()}`;

    if (roll < 0.3) {
      // Rush Surge — double passenger spawns for 15s
      s.activeEvents.push({ id: nextId, type: 'rush_surge', timer: 15000 });
      s.rushHourActive = true;
      s.rushHourCooldown = 15000;
      addNotification(s, '🚇 Хвиля пасажирів!', 0.5, 0.4, '#f59e0b');
      s.eventLog.push('Хвиля пасажирів!');
    } else if (roll < 0.55) {
      // VIP Passenger
      const activeSet = new Set(s.activeStationIds);
      const openStations = s.stations.filter(st => activeSet.has(st.id) && !st.isDestroyed && st.isOpen && st.passengers.length < st.maxPassengers);
      if (openStations.length > 0) {
        const station = openStations[Math.floor(Math.random() * openStations.length)];
        const shapes: ('circle' | 'square' | 'triangle' | 'diamond' | 'star')[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
        const possibleShapes = shapes.filter(sh => sh !== station.shape);
        const shape = possibleShapes[Math.floor(Math.random() * possibleShapes.length)];
        station.passengers.push({
          id: nextId, shape, spawnTime: s.elapsedTime, stationId: station.id, patience: 30000, isVIP: true,
        });
        s.activeEvents.push({ id: nextId, type: 'vip_passenger', timer: 30000, data: { stationId: station.id } });
        addNotification(s, '⭐ VIP пасажир!', station.x, station.y, '#fbbf24');
        s.eventLog.push('VIP пасажир з\'явився!');
      }
    } else if (roll < 0.65) {
      // Power Flicker — visual only, brief
      s.activeEvents.push({ id: nextId, type: 'power_flicker', timer: 3000 });
      s.screenPulseTimer = 1000;
      s.screenPulseColor = '#6366f1';
      addNotification(s, '⚡ Коливання напруги!', 0.5, 0.5, '#818cf8');
      s.eventLog.push('Коливання напруги');
    } else if (roll < 0.8) {
      // Power Surge — all stations get +10 HP
      s.activeEvents.push({ id: nextId, type: 'power_surge' as any, timer: 5000 });
      const activeSet = new Set(s.activeStationIds);
      for (const st of s.stations) {
        if (activeSet.has(st.id) && !st.isDestroyed) {
          st.hp = Math.min(st.maxHp, st.hp + 10);
        }
      }
      addNotification(s, '⚡ Енергосплеск! +10HP всім!', 0.5, 0.5, '#22c55e');
      s.eventLog.push('Енергосплеск: +10HP');
    } else if (roll < 0.9) {
      // Tunnel Flood — close random segment for 20s
      const lines = ['red', 'blue', 'green'];
      const line = lines[Math.floor(Math.random() * lines.length)];
      const lineStations = s._cachedLineStations[line];
      if (lineStations && lineStations.length >= 2) {
        const idx = Math.floor(Math.random() * (lineStations.length - 1));
        s.closedSegments.push({ line, from: lineStations[idx], to: lineStations[idx + 1], timer: 20000 });
        s.activeEvents.push({ id: nextId, type: 'emergency_evac', timer: 20000 });
        addNotification(s, '🌊 Затоплення тунелю!', 0.5, 0.5, '#3b82f6');
        s.eventLog.push('Затоплення тунелю!');
      }
    } else {
      // Emergency Evac — overflow one station
      const activeSet = new Set(s.activeStationIds);
      const crowded = s.stations.filter(st => activeSet.has(st.id) && !st.isDestroyed && st.passengers.length > 3);
      if (crowded.length > 0) {
        const station = crowded[Math.floor(Math.random() * crowded.length)];
        const shapes: ('circle' | 'square' | 'triangle' | 'diamond' | 'star')[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
        for (let i = 0; i < 3 && station.passengers.length < station.maxPassengers; i++) {
          const possibleShapes = shapes.filter(sh => sh !== station.shape);
          station.passengers.push({
            id: `evac_${i}_${Date.now()}`,
            shape: possibleShapes[Math.floor(Math.random() * possibleShapes.length)],
            spawnTime: s.elapsedTime, stationId: station.id, patience: 12000,
          });
        }
        s.activeEvents.push({ id: nextId, type: 'emergency_evac', timer: 15000, data: { stationId: station.id } });
        addNotification(s, '🚨 Евакуація!', station.x, station.y, '#ef4444');
        s.eventLog.push(`Евакуація: ${station.nameUa}`);
      }
    }
  }

  // Keep event log trimmed
  while (s.eventLog.length > 20) s.eventLog.shift();
}
