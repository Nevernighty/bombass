import { PassengerShape } from './constants';

export interface GameStation {
  id: string;
  name: string;
  nameUa: string;
  x: number;
  y: number;
  line: 'red' | 'blue' | 'green';
  isTransfer: boolean;
  depth: 'shallow' | 'deep';
  shape: PassengerShape;
  passengers: Passenger[];
  hp: number;
  maxHp: number;
  maxPassengers: number;
  isDestroyed: boolean;
  isOnFire: boolean;
  fireTimer: number;
  isRepairing: boolean;
  repairProgress: number;
  jellyOffset: { x: number; y: number };
  jellyVel: { x: number; y: number };
  isOpen: boolean;
  shelterCount: number;
  hasAntiAir: boolean;
  shieldTimer: number;
  level: number;
}

export interface Passenger {
  id: string;
  shape: PassengerShape;
  spawnTime: number;
  stationId: string;
  patience: number; // ms remaining before leaving
}

export type DroneType = 'shahed' | 'molniya' | 'gerbera';

export interface Train {
  id: string;
  line: 'red' | 'blue' | 'green';
  routeIndex: number;
  progress: number;
  direction: 1 | -1;
  speed: number;
  passengers: Passenger[];
  capacity: number;
  x: number;
  y: number;
  dwellTimer: number;
  isDwelling: boolean;
  level: number;
}

export interface Drone {
  id: string;
  x: number;
  y: number;
  targetStationId: string;
  speed: number;
  angle: number;
  isDestroyed: boolean;
  wobble: number;
  droneType: DroneType;
  hp: number;
  maxHp: number;
}

export interface SurfaceVehicle {
  id: string;
  routeId: string;
  type: 'bus' | 'tram' | 'rail';
  stopIndex: number;
  progress: number;
  direction: 1 | -1;
  x: number;
  y: number;
  passengers: Passenger[];
  isFrozen: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  time: number;
}

export interface RepairUnit {
  id: string;
  x: number;
  y: number;
  targetStationId: string;
  progress: number;
  speed: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  targetX: number;
  targetY: number;
}

export interface GameState {
  stations: GameStation[];
  trains: Train[];
  drones: Drone[];
  surfaceVehicles: SurfaceVehicle[];
  explosions: Explosion[];
  repairUnits: RepairUnit[];
  camera: Camera;
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  money: number;
  passengersDelivered: number;
  passengersAbandoned: number;
  dronesIntercepted: number;
  totalDrones: number;
  stationsDestroyed: number;
  stationsRepaired: number;
  networkEfficiency: number;
  peakLoad: number;
  dayTime: number;
  isNight: boolean;
  isAirRaid: boolean;
  airRaidTimer: number;
  nextRaidTime: number;
  raidDronesSpawned: number;
  screenShake: number;
  gameOver: boolean;
  gameStarted: boolean;
  isPaused: boolean;
  elapsedTime: number;
  speedMultiplier: number;
  unlockedRoutes: string[];
  selectedTrain: string | null;
  hoveredStation: string | null;
  activeStationIds: string[];
  nextStationUnlockTime: number;
  qteActive: boolean;
  qteDroneId: string | null;
  qteKey: string;
  qteTimer: number;
  notifications: GameNotification[];
  waveIndex: number;
  // cached per-tick (avoid recompute)
  _cachedLineStations: Record<string, string[]>;
}

export interface GameNotification {
  id: string;
  text: string;
  x: number;
  y: number;
  timer: number;
  color: string;
}
