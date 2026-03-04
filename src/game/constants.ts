// Kyiv Metro station data with real approximate positions (normalized 0-1)
export interface StationData {
  id: string;
  name: string;
  nameUa: string;
  x: number;
  y: number;
  line: 'red' | 'blue' | 'green';
  isTransfer?: boolean;
  depth: 'shallow' | 'deep'; // deep stations = shelter capacity
}

export const METRO_LINES = {
  red: { color: '#e74c3c', glowColor: '#ff6b6b', name: 'M1 Святошинсько-Броварська' },
  blue: { color: '#3498db', glowColor: '#5dade2', name: 'M2 Куренівсько-Червоноармійська' },
  green: { color: '#2ecc71', glowColor: '#58d68d', name: 'M3 Сирецько-Печерська' },
};

// Stations positioned on a ~1200x800 logical map
export const STATIONS: StationData[] = [
  // Red Line (M1) - West to East
  { id: 'r1', name: 'Akademmistechko', nameUa: 'Академмістечко', x: 0.05, y: 0.55, line: 'red', depth: 'shallow' },
  { id: 'r2', name: 'Zhytomyrska', nameUa: 'Житомирська', x: 0.10, y: 0.55, line: 'red', depth: 'shallow' },
  { id: 'r3', name: 'Sviatoshyn', nameUa: 'Святошин', x: 0.15, y: 0.55, line: 'red', depth: 'shallow' },
  { id: 'r4', name: 'Nyvky', nameUa: 'Нивки', x: 0.20, y: 0.55, line: 'red', depth: 'shallow' },
  { id: 'r5', name: 'Beresteiska', nameUa: 'Берестейська', x: 0.25, y: 0.55, line: 'red', depth: 'deep' },
  { id: 'r6', name: 'Shuliavska', nameUa: 'Шулявська', x: 0.30, y: 0.52, line: 'red', depth: 'deep' },
  { id: 'r7', name: 'Politekhnichnyi', nameUa: 'Політехнічний інститут', x: 0.35, y: 0.50, line: 'red', depth: 'deep' },
  { id: 'r8', name: 'Vokzalna', nameUa: 'Вокзальна', x: 0.40, y: 0.50, line: 'red', depth: 'deep' },
  { id: 'r9', name: 'Universytet', nameUa: 'Університет', x: 0.44, y: 0.52, line: 'red', depth: 'deep' },
  { id: 'r10', name: 'Teatralna', nameUa: 'Театральна', x: 0.48, y: 0.50, line: 'red', isTransfer: true, depth: 'deep' },
  { id: 'r11', name: 'Khreshchatyk', nameUa: 'Хрещатик', x: 0.52, y: 0.48, line: 'red', isTransfer: true, depth: 'deep' },
  { id: 'r12', name: 'Arsenalna', nameUa: 'Арсенальна', x: 0.56, y: 0.46, line: 'red', depth: 'deep' },
  { id: 'r13', name: 'Dnipro', nameUa: 'Дніпро', x: 0.62, y: 0.44, line: 'red', depth: 'shallow' },
  { id: 'r14', name: 'Hidropark', nameUa: 'Гідропарк', x: 0.68, y: 0.42, line: 'red', depth: 'shallow' },
  { id: 'r15', name: 'Livoberezhna', nameUa: 'Лівобережна', x: 0.75, y: 0.42, line: 'red', depth: 'shallow' },
  { id: 'r16', name: 'Darnytsia', nameUa: 'Дарниця', x: 0.82, y: 0.42, line: 'red', depth: 'shallow' },
  { id: 'r17', name: 'Chernihivska', nameUa: 'Чернігівська', x: 0.88, y: 0.42, line: 'red', depth: 'shallow' },
  { id: 'r18', name: 'Lisova', nameUa: 'Лісова', x: 0.94, y: 0.42, line: 'red', depth: 'shallow' },

  // Blue Line (M2) - North to South
  { id: 'b1', name: 'Heroiv Dnipra', nameUa: 'Героїв Дніпра', x: 0.50, y: 0.08, line: 'blue', depth: 'shallow' },
  { id: 'b2', name: 'Minska', nameUa: 'Мінська', x: 0.48, y: 0.14, line: 'blue', depth: 'shallow' },
  { id: 'b3', name: 'Obolon', nameUa: 'Оболонь', x: 0.46, y: 0.20, line: 'blue', depth: 'shallow' },
  { id: 'b4', name: 'Pochaina', nameUa: 'Почайна', x: 0.45, y: 0.26, line: 'blue', depth: 'deep' },
  { id: 'b5', name: 'Tarasa Shevchenka', nameUa: 'Тараса Шевченка', x: 0.46, y: 0.32, line: 'blue', depth: 'deep' },
  { id: 'b6', name: 'Kontraktova Ploshcha', nameUa: 'Контрактова площа', x: 0.48, y: 0.38, line: 'blue', depth: 'deep' },
  { id: 'b7', name: 'Poshtova Ploshcha', nameUa: 'Поштова площа', x: 0.50, y: 0.42, line: 'blue', depth: 'deep' },
  { id: 'b8', name: 'Maidan Nezalezhnosti', nameUa: 'Майдан Незалежності', x: 0.52, y: 0.48, line: 'blue', isTransfer: true, depth: 'deep' },
  { id: 'b9', name: 'Ploshcha Ukrainskykh Heroiv', nameUa: 'Площа Українських Героїв', x: 0.50, y: 0.54, line: 'blue', depth: 'deep' },
  { id: 'b10', name: 'Olimpiiska', nameUa: 'Олімпійська', x: 0.48, y: 0.60, line: 'blue', depth: 'deep' },
  { id: 'b11', name: 'Palats Ukraina', nameUa: 'Палац «Україна»', x: 0.50, y: 0.66, line: 'blue', depth: 'deep' },
  { id: 'b12', name: 'Lybidska', nameUa: 'Либідська', x: 0.52, y: 0.72, line: 'blue', depth: 'deep' },
  { id: 'b13', name: 'Demiivska', nameUa: 'Деміївська', x: 0.50, y: 0.78, line: 'blue', depth: 'shallow' },
  { id: 'b14', name: 'Holosiivska', nameUa: 'Голосіївська', x: 0.48, y: 0.84, line: 'blue', depth: 'shallow' },
  { id: 'b15', name: 'Vasylkivska', nameUa: 'Васильківська', x: 0.46, y: 0.90, line: 'blue', depth: 'shallow' },
  { id: 'b16', name: 'Vystavkovyi Tsentr', nameUa: 'Виставковий центр', x: 0.44, y: 0.95, line: 'blue', depth: 'shallow' },

  // Green Line (M3) - Syrets to Kharkivska
  { id: 'g1', name: 'Syrets', nameUa: 'Сирець', x: 0.30, y: 0.30, line: 'green', depth: 'shallow' },
  { id: 'g2', name: 'Dorohozhychi', nameUa: 'Дорогожичі', x: 0.33, y: 0.34, line: 'green', depth: 'shallow' },
  { id: 'g3', name: 'Lukianivska', nameUa: 'Лук\'янівська', x: 0.36, y: 0.38, line: 'green', depth: 'deep' },
  { id: 'g4', name: 'Zoloti Vorota', nameUa: 'Золоті ворота', x: 0.42, y: 0.44, line: 'green', isTransfer: true, depth: 'deep' },
  { id: 'g5', name: 'Palats Sportu', nameUa: 'Палац спорту', x: 0.46, y: 0.50, line: 'green', isTransfer: true, depth: 'deep' },
  { id: 'g6', name: 'Klovska', nameUa: 'Кловська', x: 0.50, y: 0.54, line: 'green', depth: 'deep' },
  { id: 'g7', name: 'Pecherska', nameUa: 'Печерська', x: 0.54, y: 0.56, line: 'green', depth: 'deep' },
  { id: 'g8', name: 'Zvirynetska', nameUa: 'Звіринецька', x: 0.58, y: 0.58, line: 'green', depth: 'deep' },
  { id: 'g9', name: 'Vydubychi', nameUa: 'Видубичі', x: 0.62, y: 0.62, line: 'green', depth: 'shallow' },
  { id: 'g10', name: 'Slavutych', nameUa: 'Славутич', x: 0.70, y: 0.62, line: 'green', depth: 'shallow' },
  { id: 'g11', name: 'Osokorky', nameUa: 'Осокорки', x: 0.76, y: 0.62, line: 'green', depth: 'shallow' },
  { id: 'g12', name: 'Pozniaky', nameUa: 'Позняки', x: 0.82, y: 0.64, line: 'green', depth: 'shallow' },
  { id: 'g13', name: 'Kharkivska', nameUa: 'Харківська', x: 0.88, y: 0.66, line: 'green', depth: 'shallow' },
  { id: 'g14', name: 'Vyrlytsia', nameUa: 'Вирлиця', x: 0.92, y: 0.70, line: 'green', depth: 'shallow' },
  { id: 'g15', name: 'Boryspilska', nameUa: 'Бориспільська', x: 0.95, y: 0.74, line: 'green', depth: 'shallow' },
];

// Passenger shape types
export type PassengerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export const SHAPE_COLORS: Record<PassengerShape, string> = {
  circle: '#f39c12',
  square: '#9b59b6',
  triangle: '#1abc9c',
  diamond: '#e67e22',
  star: '#e91e63',
};

// Game config
export const GAME_CONFIG = {
  MAP_WIDTH: 1200,
  MAP_HEIGHT: 800,
  STATION_RADIUS: 12,
  STATION_HIT_RADIUS: 24,
  TRAIN_SPEED: 0.7,
  TRAIN_CAPACITY: 6,
  PASSENGER_SPAWN_INTERVAL: 3000,
  MAX_PASSENGERS_PER_STATION: 8,
  AIR_RAID_MIN_INTERVAL: 45000,
  AIR_RAID_MAX_INTERVAL: 90000,
  AIR_RAID_DURATION: 25000,
  DRONE_SPEED: 0.8,
  DRONE_SPAWN_INTERVAL: 4000,
  DAY_CYCLE_DURATION: 120000, // 2 min per day
  REPAIR_TIME: 8000,
};

// Dnipro river path (normalized coordinates for the river)
export const DNIPRO_RIVER_POINTS = [
  { x: 0.58, y: 0.0 },
  { x: 0.57, y: 0.10 },
  { x: 0.59, y: 0.20 },
  { x: 0.60, y: 0.30 },
  { x: 0.59, y: 0.40 },
  { x: 0.61, y: 0.45 },
  { x: 0.63, y: 0.50 },
  { x: 0.64, y: 0.55 },
  { x: 0.63, y: 0.60 },
  { x: 0.62, y: 0.65 },
  { x: 0.64, y: 0.70 },
  { x: 0.65, y: 0.80 },
  { x: 0.66, y: 0.90 },
  { x: 0.67, y: 1.0 },
];

// Surface transit routes (unlockable)
export interface SurfaceRoute {
  id: string;
  type: 'bus' | 'tram' | 'rail';
  color: string;
  stops: { x: number; y: number; name: string }[];
  unlockScore: number;
}

export const SURFACE_ROUTES: SurfaceRoute[] = [
  {
    id: 'bus1', type: 'bus', color: '#f1c40f',
    stops: [
      { x: 0.15, y: 0.45, name: 'Шулявка' },
      { x: 0.25, y: 0.42, name: 'КПІ' },
      { x: 0.35, y: 0.40, name: 'Університет' },
      { x: 0.45, y: 0.38, name: 'Золоті Ворота' },
    ],
    unlockScore: 50,
  },
  {
    id: 'tram1', type: 'tram', color: '#e67e22',
    stops: [
      { x: 0.30, y: 0.65, name: 'Деміївка' },
      { x: 0.38, y: 0.60, name: 'Либідська' },
      { x: 0.45, y: 0.55, name: 'Палац Спорту' },
      { x: 0.52, y: 0.50, name: 'Бессарабка' },
    ],
    unlockScore: 100,
  },
  {
    id: 'tram2', type: 'tram', color: '#d35400',
    stops: [
      { x: 0.42, y: 0.25, name: 'Подол' },
      { x: 0.46, y: 0.30, name: 'Контрактова' },
      { x: 0.50, y: 0.35, name: 'Поштова' },
      { x: 0.54, y: 0.40, name: 'Набережна' },
    ],
    unlockScore: 200,
  },
  {
    id: 'rail1', type: 'rail', color: '#8e44ad',
    stops: [
      { x: 0.10, y: 0.35, name: 'Святошин-залізн.' },
      { x: 0.22, y: 0.40, name: 'Борщагівка' },
      { x: 0.35, y: 0.48, name: 'Вокзальна-залізн.' },
      { x: 0.50, y: 0.45, name: 'Київ-Пас.' },
      { x: 0.72, y: 0.50, name: 'Дарниця-залізн.' },
    ],
    unlockScore: 300,
  },
];
