import { AudioEngine } from '../AudioEngine';
import { EventBus, GameEvent } from './EventBus';

// Listens to EventBus and plays appropriate audio — decouples audio from simulation
export class AudioFeedback {
  constructor(private audio: AudioEngine, private bus: EventBus) {
    this.bind();
  }

  private bind() {
    this.bus.on('PASSENGER_DELIVERED', () => this.audio.playSuccess());
    this.bus.on('DRONE_DESTROYED', () => this.audio.playIntercept());
    this.bus.on('DRONE_HIT_STATION', () => this.audio.playExplosion());
    this.bus.on('STATION_UNLOCKED', () => this.audio.playClick());
    this.bus.on('TRAIN_ARRIVE', () => this.audio.playStationArrive());
    this.bus.on('AIR_RAID_START', () => this.audio.startSiren());
    this.bus.on('AIR_RAID_END', () => { this.audio.stopSiren(); this.audio.playAllClear(); });
    this.bus.on('QTE_SUCCESS', () => this.audio.playIntercept());
    this.bus.on('STATION_REPAIRED', () => this.audio.playSuccess());
    this.bus.on('SHIELD_BLOCK', () => this.audio.playIntercept());
    this.bus.on('PASSENGER_ABANDONED', () => this.audio.playClick());
  }

  destroy() {
    // In a full impl we'd remove listeners
  }
}
