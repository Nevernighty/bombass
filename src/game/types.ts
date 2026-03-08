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
  isSheltering: boolean;
  tunnelSealTimer: number;
  magnetTimer: number;
  // Phase 6
  hasSAM: boolean;
  samCooldown: number;
  hasAATurret: boolean;
  turretCooldown: number;
  stationIncome: number;
}

export interface Passenger {
  id: string;
  shape: PassengerShape;
  spawnTime: number;
  stationId: string;
  patience: number;
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
  targetBuildingIdx: number;
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

export type CameraMode = 'free' | 'follow' | 'overview' | 'cinematic';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  targetX: number;
  targetY: number;
  mode: CameraMode;
  orbitAngle: number;
  orbitSpeed: number;
}

export interface BuildingState {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  height: number;
  width: number;
  depth: number;
}

export interface Decoy {
  id: string;
  x: number;
  y: number;
  timer: number;
  hp: number;
}

export interface InterceptorDrone {
  id: string;
  x: number;
  y: number;
  targetDroneId: string;
  speed: number;
  sourceStationId: string;
}

export interface TracerLine {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  timer: number;
  color: string;
}

export type GameMode = 'classic' | 'rush_hour' | 'siege' | 'blackout' | 'bridge_defense';

export interface Achievement {
  id: string;
  nameUa: string;
  icon: string;
  condition: string;
  unlocked: boolean;
  unlockedAt?: number;
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
  notifications: GameNotification[];
  waveIndex: number;
  // Phase 4
  buildings: BuildingState[];
  selectedDroneId: string | null;
  powerGrid: number;
  maxPower: number;
  generators: number;
  rushHourTimer: number;
  rushHourActive: boolean;
  rushHourCooldown: number;
  radarActive: boolean;
  radarWarnings: { x: number; y: number; timer: number }[];
  decoys: Decoy[];
  speedBoostLine: string | null;
  speedBoostTimer: number;
  speedBoostCooldown: number;
  comboMilestones: number[];
  buildingsDestroyed: number;
  // Phase 5
  gameMode: GameMode;
  achievements: Achievement[];
  satisfactionRate: number;
  doubleFareTimer: number;
  expressLineId: string | null;
  expressTimer: number;
  blackoutMode: boolean;
  signalFlareTimer: number;
  droneJammerTimer: number;
  emergencyBrakeTimer: number;
  stationMagnetId: string | null;
  stationMagnetTimer: number;
  winConditionMet: boolean;
  modeTimer: number;
  // Phase 6
  interceptorDrones: InterceptorDrone[];
  tracerLines: TracerLine[];
  isRaining: boolean;
  weatherTimer: number;
  autoRepairTimer: number;
  // cached per-tick
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
