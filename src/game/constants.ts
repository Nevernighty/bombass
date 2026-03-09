import { getCityConfig, CityConfig } from './config/cities';

export type PassengerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export const SHAPE_COLORS: Record<PassengerShape, string> = {
  circle: '#ff6b6b', square: '#4ecdc4', triangle: '#ffe66d', diamond: '#a29bfe', star: '#fd79a8',
};

// Default city for backward compat
const DEFAULT_CITY = 'kyiv';

export function getCityLines(cityId: string = DEFAULT_CITY) {
  const city = getCityConfig(cityId);
  return city.lines;
}

// Legacy compat — Kyiv lines as default
export const METRO_LINES = getCityConfig(DEFAULT_CITY).lines as Record<string, { id?: string; color: string; glowColor: string; name: string }>;

export function getMapDimensions(cityId: string = DEFAULT_CITY) {
  const city = getCityConfig(cityId);
  return { width: city.mapWidth, height: city.mapHeight };
}

export const MAP_WIDTH = 200;
export const MAP_HEIGHT = 160;

export function toWorld(nx: number, ny: number, cityId?: string): [number, number, number] {
  const { width, height } = cityId ? getMapDimensions(cityId) : { width: MAP_WIDTH, height: MAP_HEIGHT };
  return [(nx - 0.5) * width, 0, (ny - 0.5) * height];
}

export function toWorldXZ(nx: number, ny: number, cityId?: string): { x: number; z: number } {
  const { width, height } = cityId ? getMapDimensions(cityId) : { width: MAP_WIDTH, height: MAP_HEIGHT };
  return { x: (nx - 0.5) * width, z: (ny - 0.5) * height };
}

export const GAME_CONFIG = {
  TRAIN_SPEED: 0.5,
  TRAIN_CAPACITY: 6,
  PASSENGER_SPAWN_INTERVAL: 3000,
  MAX_PASSENGERS_PER_STATION: 8,
  STATION_RADIUS: 12,
  STATION_HIT_RADIUS: 22,
  DAY_CYCLE_DURATION: 120000,
  AIR_RAID_MIN_INTERVAL: 40000,
  AIR_RAID_MAX_INTERVAL: 80000,
  AIR_RAID_DURATION: 25000,
  DRONE_SPAWN_INTERVAL: 4000,
  DRONE_SPEED: 1.0,
  REPAIR_TIME: 8000,
  TRAIN_COST: 50,
  ANTI_AIR_COST: 80,
  SHIELD_COST: 30,
  SHIELD_DURATION: 10000,
  UPGRADE_COST: 40,
  REINFORCEMENT_COST: 25,
  DWELL_TIME: 1200,
  GENERATOR_COST: 50,
  RADAR_COST: 60,
  DECOY_COST: 40,
  SPEED_BOOST_COST: 20,
  TUNNEL_SEAL_COST: 15,
  EMERGENCY_BRAKE_COST: 10,
  DOUBLE_FARE_COST: 15,
  EXPRESS_LINE_COST: 35,
  SIGNAL_FLARE_COST: 8,
  PASSENGER_AIRDROP_COST: 25,
  STATION_MAGNET_COST: 20,
  DRONE_JAMMER_COST: 45,
  SAM_BATTERY_COST: 120,
  INTERCEPTOR_COST: 80,
  AA_TURRET_COST: 60,
  INTERCITY_COST: 100,
  BUILDING_UPGRADE_COST: 50,
};

export const DRONE_TYPES = {
  shahed: { speed: 0.8, hp: 1, damage: 40, color: '#555555', scale: 0.5 },
  molniya: { speed: 1.8, hp: 1, damage: 20, color: '#888888', scale: 0.3 },
  gerbera: { speed: 0.5, hp: 3, damage: 70, color: '#666666', scale: 0.6 },
} as const;

// City-aware station/line helpers
export function getStationsForCity(cityId: string = DEFAULT_CITY) {
  return getCityConfig(cityId).stations;
}

export function getLineStationsForCity(cityId: string = DEFAULT_CITY): Record<string, string[]> {
  const city = getCityConfig(cityId);
  const result: Record<string, string[]> = {};
  for (const lineId of Object.keys(city.lines)) {
    result[lineId] = city.stations.filter(s => s.line === lineId).map(s => s.id);
  }
  return result;
}

export function getStationMapForCity(cityId: string = DEFAULT_CITY) {
  const stations = getStationsForCity(cityId);
  return new Map(stations.map(s => [s.id, s]));
}

export function getBridgeStationsForCity(cityId: string = DEFAULT_CITY) {
  return new Set(getStationsForCity(cityId).filter(s => (s as any).isBridge).map(s => s.id));
}

export function getRiverPointsForCity(cityId: string = DEFAULT_CITY) {
  return getCityConfig(cityId).riverPoints || [];
}

export function getSurfaceRoutesForCity(cityId: string = DEFAULT_CITY) {
  return getCityConfig(cityId).surfaceRoutes;
}

// Legacy exports — Kyiv defaults for backward compat
export const STATIONS = getStationsForCity(DEFAULT_CITY);
export const STATION_MAP = getStationMapForCity(DEFAULT_CITY);
export const LINE_STATIONS = getLineStationsForCity(DEFAULT_CITY);
export const BRIDGE_STATION_IDS = getBridgeStationsForCity(DEFAULT_CITY);
export const DNIPRO_RIVER_POINTS = getRiverPointsForCity(DEFAULT_CITY);
export const SURFACE_ROUTES = getSurfaceRoutesForCity(DEFAULT_CITY);
