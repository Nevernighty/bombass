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
  hp: number; // 0-100
  maxHp: number;
  isDestroyed: boolean;
  isOnFire: boolean;
  fireTimer: number;
  isRepairing: boolean;
  repairProgress: number;
  jellyOffset: { x: number; y: number }; // wobble
  jellyVel: { x: number; y: number };
  isOpen: boolean;
  shelterCount: number; // passengers sheltering during raid
}

export interface Passenger {
  id: string;
  shape: PassengerShape;
  spawnTime: number;
  stationId: string;
}

export interface Train {
  id: string;
  line: 'red' | 'blue' | 'green';
  routeIndex: number; // current station index in route
  progress: number; // 0-1 between stations
  direction: 1 | -1;
  speed: number;
  passengers: Passenger[];
  capacity: number;
  x: number;
  y: number;
  dwellTimer: number;
  isDwelling: boolean;
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
  passengersDelivered: number;
  dronesIntercepted: number;
  totalDrones: number;
  stationsDestroyed: number;
  stationsRepaired: number;
  networkEfficiency: number;
  peakLoad: number;
  dayTime: number; // 0-1 (0=midnight, 0.5=noon)
  isNight: boolean;
  isAirRaid: boolean;
  airRaidTimer: number;
  nextRaidTime: number;
  screenShake: number;
  gameOver: boolean;
  gameStarted: boolean;
  isPaused: boolean;
  elapsedTime: number;
  unlockedRoutes: string[];
  selectedTrain: string | null;
  hoveredStation: string | null;
  activeStationIds: string[];
  nextStationUnlockTime: number;
  qteActive: boolean;
  qteDroneId: string | null;
  qteKey: string;
  qteTimer: number;
}
