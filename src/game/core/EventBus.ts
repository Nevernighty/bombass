// Typed event bus for decoupling simulation from audio/VFX
export type GameEventType =
  | 'PASSENGER_DELIVERED'
  | 'PASSENGER_ABANDONED'
  | 'DRONE_DESTROYED'
  | 'DRONE_HIT_STATION'
  | 'STATION_DESTROYED'
  | 'STATION_REPAIRED'
  | 'STATION_OVERFLOW'
  | 'TRAIN_ARRIVE'
  | 'AIR_RAID_START'
  | 'AIR_RAID_END'
  | 'QTE_SUCCESS'
  | 'QTE_FAIL'
  | 'STATION_UNLOCKED'
  | 'WAVE_ADVANCE'
  | 'SHIELD_BLOCK'
  | 'MILESTONE_REACHED'
  | 'FEVER_START'
  | 'FEVER_END'
  | 'STREAK_BREAK'
  | 'MONEY_EARNED';

export interface GameEvent {
  type: GameEventType;
  x?: number;
  y?: number;
  data?: Record<string, any>;
}

type Listener = (event: GameEvent) => void;

export class EventBus {
  private listeners = new Map<GameEventType, Listener[]>();
  private queue: GameEvent[] = [];

  on(type: GameEventType, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(listener);
  }

  off(type: GameEventType, listener: Listener) {
    const arr = this.listeners.get(type);
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  emit(event: GameEvent) {
    this.queue.push(event);
  }

  flush() {
    const events = [...this.queue];
    this.queue = [];
    for (const event of events) {
      const listeners = this.listeners.get(event.type);
      if (listeners) {
        for (const listener of listeners) {
          listener(event);
        }
      }
    }
    return events;
  }

  clear() {
    this.queue = [];
  }
}
