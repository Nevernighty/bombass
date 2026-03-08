import { DroneType } from '../types';

// Difficulty wave configs — data-driven
export interface WaveConfig {
  startTime: number;
  passengerSpawnRate: number;
  droneTypes: DroneType[];
  droneSpawnRate: number;
  raidDuration: number;
  calmMin: number;
  calmMax: number;
  maxDronesPerRaid: number;
}

export const WAVE_TABLE: WaveConfig[] = [
  { startTime: 0,      passengerSpawnRate: 3500, droneTypes: ['shahed'],                     droneSpawnRate: 5000, raidDuration: 18000, calmMin: 55000, calmMax: 85000, maxDronesPerRaid: 3 },
  { startTime: 45000,  passengerSpawnRate: 3000, droneTypes: ['shahed'],                     droneSpawnRate: 4000, raidDuration: 22000, calmMin: 45000, calmMax: 75000, maxDronesPerRaid: 4 },
  { startTime: 90000,  passengerSpawnRate: 2500, droneTypes: ['shahed', 'molniya'],          droneSpawnRate: 3500, raidDuration: 25000, calmMin: 40000, calmMax: 65000, maxDronesPerRaid: 5 },
  { startTime: 150000, passengerSpawnRate: 2000, droneTypes: ['shahed', 'molniya'],          droneSpawnRate: 3000, raidDuration: 28000, calmMin: 35000, calmMax: 55000, maxDronesPerRaid: 6 },
  { startTime: 240000, passengerSpawnRate: 1600, droneTypes: ['shahed', 'molniya', 'gerbera'], droneSpawnRate: 2500, raidDuration: 32000, calmMin: 28000, calmMax: 45000, maxDronesPerRaid: 8 },
  { startTime: 360000, passengerSpawnRate: 1200, droneTypes: ['shahed', 'molniya', 'gerbera'], droneSpawnRate: 2000, raidDuration: 35000, calmMin: 22000, calmMax: 38000, maxDronesPerRaid: 10 },
  { startTime: 480000, passengerSpawnRate: 900,  droneTypes: ['shahed', 'molniya', 'gerbera'], droneSpawnRate: 1500, raidDuration: 40000, calmMin: 18000, calmMax: 30000, maxDronesPerRaid: 14 },
];

export function getCurrentWave(elapsedTime: number): WaveConfig {
  let wave = WAVE_TABLE[0];
  for (const w of WAVE_TABLE) {
    if (elapsedTime >= w.startTime) wave = w;
    else break;
  }
  return wave;
}

export function getCurrentWaveIndex(elapsedTime: number): number {
  let idx = 0;
  for (let i = 0; i < WAVE_TABLE.length; i++) {
    if (elapsedTime >= WAVE_TABLE[i].startTime) idx = i;
    else break;
  }
  return idx;
}

// Passenger patience config
export const PATIENCE_BASE = 25000; // 25s base patience
export const PATIENCE_MIN = 10000; // 10s minimum
export const PATIENCE_DECAY_PER_WAVE = 2000; // -2s per wave
