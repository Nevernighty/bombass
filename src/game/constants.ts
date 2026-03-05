export type PassengerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export const SHAPE_COLORS: Record<PassengerShape, string> = {
  circle: '#ff6b6b', square: '#4ecdc4', triangle: '#ffe66d', diamond: '#a29bfe', star: '#fd79a8',
};

export const METRO_LINES = {
  red: { color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: 'M1 Святошинсько-Броварська' },
  blue: { color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', name: 'M2 Оболонсько-Теремківська' },
  green: { color: '#2ecc71', glowColor: 'rgba(46,204,113,0.6)', name: 'M3 Сирецько-Печерська' },
} as const;

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 80;

export function toWorld(nx: number, ny: number): [number, number, number] {
  return [(nx - 0.5) * MAP_WIDTH, 0, (ny - 0.5) * MAP_HEIGHT];
}

export function toWorldXZ(nx: number, ny: number): { x: number; z: number } {
  return { x: (nx - 0.5) * MAP_WIDTH, z: (ny - 0.5) * MAP_HEIGHT };
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
};

export const DRONE_TYPES = {
  shahed: { speed: 0.8, hp: 1, damage: 40, qteKeys: ['Q', 'W', 'E', 'R'], qteTime: 2000, color: '#555555', scale: 0.5 },
  molniya: { speed: 1.8, hp: 1, damage: 20, qteKeys: ['Q', 'W'], qteTime: 1000, color: '#888888', scale: 0.3 },
  gerbera: { speed: 0.5, hp: 3, damage: 70, qteKeys: ['Q', 'W', 'E', 'R'], qteTime: 3000, color: '#666666', scale: 0.6 },
} as const;

export const STATIONS = [
  { id: 'r1', name: 'Akademmistechko', nameUa: 'Академмістечко', x: 0.08, y: 0.42, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r2', name: 'Zhytomyrska', nameUa: 'Житомирська', x: 0.12, y: 0.42, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r3', name: 'Sviatoshyn', nameUa: 'Святошин', x: 0.16, y: 0.42, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r4', name: 'Nyvky', nameUa: 'Нивки', x: 0.20, y: 0.42, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r5', name: 'Beresteiska', nameUa: 'Берестейська', x: 0.24, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r6', name: 'Shuliavska', nameUa: 'Шулявська', x: 0.28, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r7', name: 'Politekhnichnyi Instytut', nameUa: 'Політехнічний інститут', x: 0.32, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r8', name: 'Vokzalna', nameUa: 'Вокзальна', x: 0.36, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r9', name: 'Universytet', nameUa: 'Університет', x: 0.40, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r10', name: 'Teatralna', nameUa: 'Театральна', x: 0.44, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'r11', name: 'Khreshchatyk', nameUa: 'Хрещатик', x: 0.48, y: 0.42, line: 'red' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'r12', name: 'Arsenalna', nameUa: 'Арсенальна', x: 0.53, y: 0.44, line: 'red' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'r13', name: 'Dnipro', nameUa: 'Дніпро', x: 0.59, y: 0.44, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r14', name: 'Hidropark', nameUa: 'Гідропарк', x: 0.65, y: 0.42, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r15', name: 'Livoberezhna', nameUa: 'Лівобережна', x: 0.72, y: 0.40, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r16', name: 'Darnytsia', nameUa: 'Дарниця', x: 0.78, y: 0.40, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r17', name: 'Chernihivska', nameUa: 'Чернігівська', x: 0.84, y: 0.40, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'r18', name: 'Lisova', nameUa: 'Лісова', x: 0.90, y: 0.40, line: 'red' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b1', name: 'Heroiv Dnipra', nameUa: 'Героїв Дніпра', x: 0.42, y: 0.08, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b2', name: 'Minska', nameUa: 'Мінська', x: 0.42, y: 0.12, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b3', name: 'Obolon', nameUa: 'Оболонь', x: 0.42, y: 0.16, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b4', name: 'Pochaina', nameUa: 'Почайна', x: 0.42, y: 0.20, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b5', name: 'Tarasa Shevchenka', nameUa: 'Тараса Шевченка', x: 0.42, y: 0.25, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b6', name: 'Kontraktova Ploshcha', nameUa: 'Контрактова площа', x: 0.42, y: 0.30, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b7', name: 'Poshtova Ploshcha', nameUa: 'Поштова площа', x: 0.44, y: 0.35, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b8', name: 'Maidan Nezalezhnosti', nameUa: 'Майдан Незалежності', x: 0.48, y: 0.42, line: 'blue' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'b9', name: 'Ploshcha Ukrainskykh Heroiv', nameUa: 'Площа Українських Героїв', x: 0.46, y: 0.50, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b10', name: 'Olimpiiska', nameUa: 'Олімпійська', x: 0.44, y: 0.56, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b11', name: 'Palats Ukraina', nameUa: 'Палац «Україна»', x: 0.42, y: 0.62, line: 'blue' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'b12', name: 'Lybidska', nameUa: 'Либідська', x: 0.42, y: 0.68, line: 'blue' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'b13', name: 'Demiivska', nameUa: 'Деміївська', x: 0.42, y: 0.74, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b14', name: 'Holosiivska', nameUa: 'Голосіївська', x: 0.42, y: 0.80, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b15', name: 'Vasylkivska', nameUa: 'Васильківська', x: 0.42, y: 0.86, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'b16', name: 'Ipodrom', nameUa: 'Іподром', x: 0.42, y: 0.92, line: 'blue' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g1', name: 'Syrets', nameUa: 'Сирець', x: 0.22, y: 0.18, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g2', name: 'Dorohozhychi', nameUa: 'Дорогожичі', x: 0.26, y: 0.22, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g3', name: 'Lukianivska', nameUa: "Лук'янівська", x: 0.30, y: 0.28, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g4', name: 'Zoloti Vorota', nameUa: 'Золоті ворота', x: 0.34, y: 0.34, line: 'green' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'g5', name: 'Palats Sportu', nameUa: 'Палац спорту', x: 0.40, y: 0.40, line: 'green' as const, depth: 'deep' as const, isTransfer: true },
  { id: 'g6', name: 'Klovska', nameUa: 'Кловська', x: 0.46, y: 0.46, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g7', name: 'Pecherska', nameUa: 'Печерська', x: 0.50, y: 0.52, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g8', name: 'Druzhby Narodiv', nameUa: 'Дружби народів', x: 0.48, y: 0.58, line: 'green' as const, depth: 'deep' as const, isTransfer: false },
  { id: 'g9', name: 'Vydubychi', nameUa: 'Видубичі', x: 0.52, y: 0.64, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g10', name: 'Slavutych', nameUa: 'Славутич', x: 0.60, y: 0.66, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g11', name: 'Osokorky', nameUa: 'Осокорки', x: 0.66, y: 0.64, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g12', name: 'Pozniaky', nameUa: 'Позняки', x: 0.72, y: 0.62, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g13', name: 'Kharkivska', nameUa: 'Харківська', x: 0.78, y: 0.60, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g14', name: 'Vyrlytsia', nameUa: 'Вирлиця', x: 0.84, y: 0.58, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
  { id: 'g15', name: 'Boryspilska', nameUa: 'Бориспільська', x: 0.88, y: 0.56, line: 'green' as const, depth: 'shallow' as const, isTransfer: false },
];

export const DNIPRO_RIVER_POINTS = [
  { x: 0.50, y: 0.0 }, { x: 0.52, y: 0.10 }, { x: 0.54, y: 0.20 },
  { x: 0.56, y: 0.30 }, { x: 0.57, y: 0.38 }, { x: 0.56, y: 0.46 },
  { x: 0.55, y: 0.55 }, { x: 0.54, y: 0.62 }, { x: 0.56, y: 0.70 },
  { x: 0.58, y: 0.80 }, { x: 0.56, y: 0.90 }, { x: 0.55, y: 1.0 },
];

export const SURFACE_ROUTES = [
  { id: 'bus1', type: 'bus' as const, color: '#e67e22', unlockScore: 100, stops: [{ x: 0.15, y: 0.38 }, { x: 0.22, y: 0.36 }, { x: 0.30, y: 0.38 }, { x: 0.38, y: 0.40 }] },
  { id: 'tram1', type: 'tram' as const, color: '#9b59b6', unlockScore: 200, stops: [{ x: 0.35, y: 0.50 }, { x: 0.38, y: 0.55 }, { x: 0.42, y: 0.58 }, { x: 0.46, y: 0.54 }] },
  { id: 'rail1', type: 'rail' as const, color: '#1abc9c', unlockScore: 400, stops: [{ x: 0.20, y: 0.32 }, { x: 0.30, y: 0.30 }, { x: 0.40, y: 0.32 }, { x: 0.50, y: 0.38 }] },
];
