import { PassengerShape } from '../constants';

export type TransitType = 'metro' | 'tram';

export interface CityLineConfig {
  id: string;
  color: string;
  glowColor: string;
  name: string;
}

export interface CityStationConfig {
  id: string;
  name: string;
  nameUa: string;
  x: number;
  y: number;
  line: string;
  depth: 'shallow' | 'deep';
  isTransfer: boolean;
  isBridge?: boolean;
}

export interface IntercityConnection {
  targetCity: string;
  travelTime: number; // ms
  cost: number;
}

export interface CityConfig {
  id: string;
  nameUa: string;
  icon: string;
  type: TransitType;
  mapWidth: number;
  mapHeight: number;
  lines: Record<string, CityLineConfig>;
  stations: CityStationConfig[];
  startingStations: string[];
  unlockOrder: Record<string, string[]>;
  riverPoints?: { x: number; y: number }[];
  intercityConnections: IntercityConnection[];
  surfaceRoutes: { id: string; type: 'bus' | 'tram' | 'rail'; color: string; unlockScore: number; stops: { x: number; y: number }[] }[];
}

// ============ KYIV ============
const KYIV: CityConfig = {
  id: 'kyiv',
  nameUa: 'Київ',
  icon: '🏙️',
  type: 'metro',
  mapWidth: 200,
  mapHeight: 160,
  lines: {
    red: { id: 'red', color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: 'M1 Святошинсько-Броварська' },
    blue: { id: 'blue', color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', name: 'M2 Оболонсько-Теремківська' },
    green: { id: 'green', color: '#2ecc71', glowColor: 'rgba(46,204,113,0.6)', name: 'M3 Сирецько-Печерська' },
  },
  stations: [
    // Red line (M1)
    { id: 'r1', name: 'Akademmistechko', nameUa: 'Академмістечко', x: 0.02, y: 0.40, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r2', name: 'Zhytomyrska', nameUa: 'Житомирська', x: 0.08, y: 0.40, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r3', name: 'Sviatoshyn', nameUa: 'Святошин', x: 0.14, y: 0.40, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r4', name: 'Nyvky', nameUa: 'Нивки', x: 0.20, y: 0.40, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r5', name: 'Beresteiska', nameUa: 'Берестейська', x: 0.25, y: 0.40, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r6', name: 'Shuliavska', nameUa: 'Шулявська', x: 0.30, y: 0.40, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r7', name: 'Politekhnichnyi Instytut', nameUa: 'Політехнічний інститут', x: 0.34, y: 0.40, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r8', name: 'Vokzalna', nameUa: 'Вокзальна', x: 0.38, y: 0.40, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r9', name: 'Universytet', nameUa: 'Університет', x: 0.42, y: 0.42, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r10', name: 'Teatralna', nameUa: 'Театральна', x: 0.46, y: 0.44, line: 'red', depth: 'deep', isTransfer: true },
    { id: 'r11', name: 'Khreshchatyk', nameUa: 'Хрещатик', x: 0.52, y: 0.40, line: 'red', depth: 'deep', isTransfer: true },
    { id: 'r12', name: 'Arsenalna', nameUa: 'Арсенальна', x: 0.58, y: 0.38, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'r13', name: 'Dnipro', nameUa: 'Дніпро', x: 0.65, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false, isBridge: true },
    { id: 'r14', name: 'Hidropark', nameUa: 'Гідропарк', x: 0.72, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false, isBridge: true },
    { id: 'r15', name: 'Livoberezhna', nameUa: 'Лівобережна', x: 0.78, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r16', name: 'Darnytsia', nameUa: 'Дарниця', x: 0.84, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r17', name: 'Chernihivska', nameUa: 'Чернігівська', x: 0.90, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false },
    { id: 'r18', name: 'Lisova', nameUa: 'Лісова', x: 0.97, y: 0.38, line: 'red', depth: 'shallow', isTransfer: false },
    // Blue line (M2)
    { id: 'b1', name: 'Heroiv Dnipra', nameUa: 'Героїв Дніпра', x: 0.46, y: 0.02, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b2', name: 'Minska', nameUa: 'Мінська', x: 0.46, y: 0.08, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b3', name: 'Obolon', nameUa: 'Оболонь', x: 0.46, y: 0.14, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b4', name: 'Pochaina', nameUa: 'Почайна', x: 0.46, y: 0.20, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b5', name: 'Tarasa Shevchenka', nameUa: 'Тараса Шевченка', x: 0.46, y: 0.26, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b6', name: 'Kontraktova Ploshcha', nameUa: 'Контрактова площа', x: 0.46, y: 0.32, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b7', name: 'Poshtova Ploshcha', nameUa: 'Поштова площа', x: 0.48, y: 0.37, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b8', name: 'Maidan Nezalezhnosti', nameUa: 'Майдан Незалежності', x: 0.52, y: 0.48, line: 'blue', depth: 'deep', isTransfer: true },
    { id: 'b9', name: 'Ploshcha Ukrainskykh Heroiv', nameUa: 'Площа Українських Героїв', x: 0.50, y: 0.54, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b10', name: 'Olimpiiska', nameUa: 'Олімпійська', x: 0.48, y: 0.60, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b11', name: 'Palats Ukraina', nameUa: 'Палац «Україна»', x: 0.44, y: 0.67, line: 'blue', depth: 'deep', isTransfer: true },
    { id: 'b12', name: 'Lybidska', nameUa: 'Либідська', x: 0.42, y: 0.73, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'b13', name: 'Demiivska', nameUa: 'Деміївська', x: 0.42, y: 0.79, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b14', name: 'Holosiivska', nameUa: 'Голосіївська', x: 0.42, y: 0.85, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b15', name: 'Vasylkivska', nameUa: 'Васильківська', x: 0.42, y: 0.91, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'b16', name: 'Ipodrom', nameUa: 'Іподром', x: 0.42, y: 0.98, line: 'blue', depth: 'shallow', isTransfer: false },
    // Green line (M3)
    { id: 'g1', name: 'Syrets', nameUa: 'Сирець', x: 0.12, y: 0.10, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g2', name: 'Dorohozhychi', nameUa: 'Дорогожичі', x: 0.18, y: 0.16, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g3', name: 'Lukianivska', nameUa: "Лук'янівська", x: 0.25, y: 0.23, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g4', name: 'Zoloti Vorota', nameUa: 'Золоті ворота', x: 0.34, y: 0.32, line: 'green', depth: 'deep', isTransfer: true },
    { id: 'g5', name: 'Palats Sportu', nameUa: 'Палац спорту', x: 0.40, y: 0.40, line: 'green', depth: 'deep', isTransfer: true },
    { id: 'g6', name: 'Klovska', nameUa: 'Кловська', x: 0.54, y: 0.52, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g7', name: 'Pecherska', nameUa: 'Печерська', x: 0.60, y: 0.56, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g8', name: 'Druzhby Narodiv', nameUa: 'Дружби народів', x: 0.58, y: 0.63, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'g9', name: 'Vydubychi', nameUa: 'Видубичі', x: 0.60, y: 0.70, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g10', name: 'Slavutych', nameUa: 'Славутич', x: 0.68, y: 0.72, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g11', name: 'Osokorky', nameUa: 'Осокорки', x: 0.74, y: 0.70, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g12', name: 'Pozniaky', nameUa: 'Позняки', x: 0.80, y: 0.68, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g13', name: 'Kharkivska', nameUa: 'Харківська', x: 0.86, y: 0.66, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g14', name: 'Vyrlytsia', nameUa: 'Вирлиця', x: 0.92, y: 0.64, line: 'green', depth: 'shallow', isTransfer: false },
    { id: 'g15', name: 'Boryspilska', nameUa: 'Бориспільська', x: 0.98, y: 0.62, line: 'green', depth: 'shallow', isTransfer: false },
  ],
  startingStations: ['r10', 'r11', 'b7', 'b8', 'g4', 'g5'],
  unlockOrder: {
    red: ['r9', 'r12', 'r8', 'r13', 'r7', 'r14', 'r6', 'r15', 'r5', 'r16', 'r4', 'r17', 'r3', 'r18', 'r2', 'r1'],
    blue: ['b6', 'b9', 'b5', 'b10', 'b4', 'b11', 'b3', 'b12', 'b2', 'b13', 'b1', 'b14', 'b15', 'b16'],
    green: ['g3', 'g6', 'g2', 'g7', 'g1', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15'],
  },
  riverPoints: [
    { x: 0.55, y: 0.0 }, { x: 0.57, y: 0.10 }, { x: 0.58, y: 0.20 },
    { x: 0.62, y: 0.30 }, { x: 0.63, y: 0.38 }, { x: 0.62, y: 0.46 },
    { x: 0.61, y: 0.55 }, { x: 0.60, y: 0.62 }, { x: 0.62, y: 0.70 },
    { x: 0.63, y: 0.80 }, { x: 0.61, y: 0.90 }, { x: 0.60, y: 1.0 },
  ],
  intercityConnections: [
    { targetCity: 'kharkiv', travelTime: 60000, cost: 100 },
    { targetCity: 'dnipro', travelTime: 50000, cost: 80 },
    { targetCity: 'lviv', travelTime: 70000, cost: 120 },
    { targetCity: 'odesa', travelTime: 55000, cost: 90 },
  ],
  surfaceRoutes: [
    { id: 'bus1', type: 'bus', color: '#e67e22', unlockScore: 100, stops: [{ x: 0.15, y: 0.38 }, { x: 0.22, y: 0.36 }, { x: 0.30, y: 0.38 }, { x: 0.38, y: 0.40 }] },
    { id: 'tram1', type: 'tram', color: '#9b59b6', unlockScore: 200, stops: [{ x: 0.35, y: 0.50 }, { x: 0.38, y: 0.55 }, { x: 0.42, y: 0.58 }, { x: 0.46, y: 0.54 }] },
    { id: 'rail1', type: 'rail', color: '#1abc9c', unlockScore: 400, stops: [{ x: 0.20, y: 0.32 }, { x: 0.30, y: 0.30 }, { x: 0.40, y: 0.32 }, { x: 0.50, y: 0.38 }] },
  ],
};

// ============ KHARKIV ============
const KHARKIV: CityConfig = {
  id: 'kharkiv',
  nameUa: 'Харків',
  icon: '🏭',
  type: 'metro',
  mapWidth: 180,
  mapHeight: 150,
  lines: {
    red: { id: 'red', color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: 'Холодногірсько-Заводська' },
    blue: { id: 'blue', color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', name: 'Салтівська' },
    green: { id: 'green', color: '#2ecc71', glowColor: 'rgba(46,204,113,0.6)', name: 'Олексіївська' },
  },
  stations: [
    // Red (Холодногірсько-Заводська)
    { id: 'hr1', name: 'Kholodna Hora', nameUa: 'Холодна Гора', x: 0.08, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr2', name: 'Pivdennyj Vokzal', nameUa: 'Південний вокзал', x: 0.16, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr3', name: 'Tsentralnyj Rynok', nameUa: 'Центральний ринок', x: 0.24, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr4', name: 'Maidan Konstytutsii', nameUa: 'Майдан Конституції', x: 0.35, y: 0.45, line: 'red', depth: 'deep', isTransfer: true },
    { id: 'hr5', name: 'Prospekt Haharina', nameUa: 'Проспект Гагаріна', x: 0.45, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr6', name: 'Sportyvna', nameUa: 'Спортивна', x: 0.55, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr7', name: 'Zavod Malysheva', nameUa: 'Завод ім. Малишева', x: 0.65, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr8', name: 'Turboatom', nameUa: 'Турбоатом', x: 0.75, y: 0.45, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'hr9', name: 'Palats Sportu', nameUa: 'Палац Спорту', x: 0.85, y: 0.45, line: 'red', depth: 'shallow', isTransfer: false },
    // Blue (Салтівська)
    { id: 'hb1', name: 'Istorychnyj Muzej', nameUa: 'Історичний музей', x: 0.35, y: 0.15, line: 'blue', depth: 'deep', isTransfer: true },
    { id: 'hb2', name: 'Universytet', nameUa: 'Університет', x: 0.35, y: 0.25, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'hb3', name: 'Pushkinska', nameUa: 'Пушкінська', x: 0.35, y: 0.35, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'hb4', name: 'Kyivska', nameUa: 'Київська', x: 0.45, y: 0.55, line: 'blue', depth: 'deep', isTransfer: false },
    { id: 'hb5', name: 'Akademika Barabashova', nameUa: 'Академіка Барабашова', x: 0.55, y: 0.60, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'hb6', name: 'Akademika Pavlova', nameUa: 'Академіка Павлова', x: 0.65, y: 0.65, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'hb7', name: 'Studentska', nameUa: 'Студентська', x: 0.75, y: 0.70, line: 'blue', depth: 'shallow', isTransfer: false },
    { id: 'hb8', name: 'Heroiv Pratsi', nameUa: 'Героїв Праці', x: 0.85, y: 0.75, line: 'blue', depth: 'shallow', isTransfer: false },
    // Green (Олексіївська)
    { id: 'hg1', name: 'Metrobudivnykiv', nameUa: 'Метробудівників', x: 0.15, y: 0.20, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'hg2', name: 'Zakhysnykiv Ukrainy', nameUa: 'Захисників України', x: 0.25, y: 0.25, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'hg3', name: 'Arkhitektora Beketova', nameUa: 'Архітектора Бекетова', x: 0.30, y: 0.35, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'hg4', name: 'Derzhprom', nameUa: 'Держпром', x: 0.35, y: 0.50, line: 'green', depth: 'deep', isTransfer: true },
    { id: 'hg5', name: 'Naukova', nameUa: 'Наукова', x: 0.40, y: 0.65, line: 'green', depth: 'deep', isTransfer: false },
    { id: 'hg6', name: 'Botanichnyj Sad', nameUa: 'Ботанічний Сад', x: 0.45, y: 0.80, line: 'green', depth: 'shallow', isTransfer: false },
  ],
  startingStations: ['hr4', 'hr5', 'hb1', 'hb3', 'hg3', 'hg4'],
  unlockOrder: {
    red: ['hr3', 'hr6', 'hr2', 'hr7', 'hr1', 'hr8', 'hr9'],
    blue: ['hb2', 'hb4', 'hb5', 'hb6', 'hb7', 'hb8'],
    green: ['hg2', 'hg5', 'hg1', 'hg6'],
  },
  riverPoints: [
    { x: 0.30, y: 0.0 }, { x: 0.32, y: 0.30 }, { x: 0.28, y: 0.60 }, { x: 0.30, y: 1.0 },
  ],
  intercityConnections: [
    { targetCity: 'kyiv', travelTime: 60000, cost: 100 },
    { targetCity: 'dnipro', travelTime: 40000, cost: 70 },
  ],
  surfaceRoutes: [
    { id: 'hbus1', type: 'bus', color: '#e67e22', unlockScore: 100, stops: [{ x: 0.20, y: 0.50 }, { x: 0.30, y: 0.50 }, { x: 0.40, y: 0.50 }] },
  ],
};

// ============ DNIPRO ============
const DNIPRO: CityConfig = {
  id: 'dnipro',
  nameUa: 'Дніпро',
  icon: '⛏️',
  type: 'metro',
  mapWidth: 160,
  mapHeight: 120,
  lines: {
    red: { id: 'red', color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: 'Центральна лінія' },
  },
  stations: [
    { id: 'dr1', name: 'Vokzalna', nameUa: 'Вокзальна', x: 0.10, y: 0.50, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'dr2', name: 'Metalurhiv', nameUa: 'Металургів', x: 0.22, y: 0.50, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'dr3', name: 'Tsentralna', nameUa: 'Центральна', x: 0.35, y: 0.48, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'dr4', name: 'Muzejna', nameUa: 'Музейна', x: 0.48, y: 0.46, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'dr5', name: 'Pokrovska', nameUa: 'Покровська', x: 0.60, y: 0.48, line: 'red', depth: 'deep', isTransfer: false },
    { id: 'dr6', name: 'Pryvokzalna', nameUa: 'Привокзальна', x: 0.72, y: 0.50, line: 'red', depth: 'shallow', isTransfer: false },
  ],
  startingStations: ['dr3', 'dr4'],
  unlockOrder: {
    red: ['dr2', 'dr5', 'dr1', 'dr6'],
  },
  riverPoints: [
    { x: 0.80, y: 0.0 }, { x: 0.82, y: 0.30 }, { x: 0.78, y: 0.60 }, { x: 0.80, y: 1.0 },
  ],
  intercityConnections: [
    { targetCity: 'kyiv', travelTime: 50000, cost: 80 },
    { targetCity: 'kharkiv', travelTime: 40000, cost: 70 },
    { targetCity: 'odesa', travelTime: 55000, cost: 85 },
  ],
  surfaceRoutes: [],
};

// ============ LVIV (Tramway) ============
const LVIV: CityConfig = {
  id: 'lviv',
  nameUa: 'Львів',
  icon: '🦁',
  type: 'tram',
  mapWidth: 160,
  mapHeight: 140,
  lines: {
    t1: { id: 't1', color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: '№1 Вокзал–Погулянка' },
    t6: { id: 't6', color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', name: '№6 Сихів–Центр' },
    t8: { id: 't8', color: '#2ecc71', glowColor: 'rgba(46,204,113,0.6)', name: '№8 Южний–Стрийська' },
  },
  stations: [
    // Tram 1
    { id: 'lt1a', name: 'Vokzal', nameUa: 'Вокзал', x: 0.15, y: 0.35, line: 't1', depth: 'shallow', isTransfer: true },
    { id: 'lt1b', name: 'Rynok', nameUa: 'Пл. Ринок', x: 0.30, y: 0.40, line: 't1', depth: 'shallow', isTransfer: true },
    { id: 'lt1c', name: 'Opera', nameUa: 'Оперний театр', x: 0.42, y: 0.38, line: 't1', depth: 'shallow', isTransfer: false },
    { id: 'lt1d', name: 'Pohulanka', nameUa: 'Погулянка', x: 0.55, y: 0.35, line: 't1', depth: 'shallow', isTransfer: false },
    { id: 'lt1e', name: 'Lychakivska', nameUa: 'Личаківська', x: 0.68, y: 0.38, line: 't1', depth: 'shallow', isTransfer: false },
    // Tram 6
    { id: 'lt6a', name: 'Sykhiv', nameUa: 'Сихів', x: 0.70, y: 0.80, line: 't6', depth: 'shallow', isTransfer: false },
    { id: 'lt6b', name: 'Naukova', nameUa: 'Наукова', x: 0.55, y: 0.70, line: 't6', depth: 'shallow', isTransfer: false },
    { id: 'lt6c', name: 'Stryiska', nameUa: 'Стрийська', x: 0.42, y: 0.60, line: 't6', depth: 'shallow', isTransfer: true },
    { id: 'lt6d', name: 'Svobody', nameUa: 'Пр. Свободи', x: 0.35, y: 0.48, line: 't6', depth: 'shallow', isTransfer: false },
    // Tram 8
    { id: 'lt8a', name: 'Pid Dubom', nameUa: 'Під Дубом', x: 0.18, y: 0.70, line: 't8', depth: 'shallow', isTransfer: false },
    { id: 'lt8b', name: 'Tarnavs\'koho', nameUa: 'Тарнавського', x: 0.28, y: 0.62, line: 't8', depth: 'shallow', isTransfer: false },
    { id: 'lt8c', name: 'Halytska', nameUa: 'Галицька', x: 0.38, y: 0.52, line: 't8', depth: 'shallow', isTransfer: false },
    { id: 'lt8d', name: 'Shevchenka', nameUa: 'Шевченка', x: 0.50, y: 0.48, line: 't8', depth: 'shallow', isTransfer: false },
  ],
  startingStations: ['lt1a', 'lt1b', 'lt6c', 'lt6d', 'lt8b', 'lt8c'],
  unlockOrder: {
    t1: ['lt1c', 'lt1d', 'lt1e'],
    t6: ['lt6b', 'lt6a'],
    t8: ['lt8a', 'lt8d'],
  },
  intercityConnections: [
    { targetCity: 'kyiv', travelTime: 70000, cost: 120 },
  ],
  surfaceRoutes: [],
};

// ============ ODESA (Tramway) ============
const ODESA: CityConfig = {
  id: 'odesa',
  nameUa: 'Одеса',
  icon: '⚓',
  type: 'tram',
  mapWidth: 160,
  mapHeight: 140,
  lines: {
    t5: { id: 't5', color: '#e74c3c', glowColor: 'rgba(231,76,60,0.6)', name: '№5 Аркадія–Вокзал' },
    t28: { id: 't28', color: '#3498db', glowColor: 'rgba(52,152,219,0.6)', name: '№28 Люстдорф–Центр' },
    t18: { id: 't18', color: '#f39c12', glowColor: 'rgba(243,156,18,0.6)', name: '№18 Порт–Фонтан' },
  },
  stations: [
    // Tram 5
    { id: 'ot5a', name: 'Arkadiya', nameUa: 'Аркадія', x: 0.70, y: 0.75, line: 't5', depth: 'shallow', isTransfer: false },
    { id: 'ot5b', name: 'Frantsuzskyj Bulvar', nameUa: 'Французький бульвар', x: 0.55, y: 0.60, line: 't5', depth: 'shallow', isTransfer: false },
    { id: 'ot5c', name: 'Derybasivska', nameUa: 'Дерибасівська', x: 0.40, y: 0.45, line: 't5', depth: 'shallow', isTransfer: true },
    { id: 'ot5d', name: 'Vokzal', nameUa: 'Вокзал', x: 0.25, y: 0.35, line: 't5', depth: 'shallow', isTransfer: true },
    // Tram 28
    { id: 'ot28a', name: 'Liustdorf', nameUa: 'Люстдорф', x: 0.15, y: 0.80, line: 't28', depth: 'shallow', isTransfer: false },
    { id: 'ot28b', name: 'Shevchenko Park', nameUa: 'Парк Шевченка', x: 0.28, y: 0.65, line: 't28', depth: 'shallow', isTransfer: false },
    { id: 'ot28c', name: 'Pryvoz', nameUa: 'Привоз', x: 0.38, y: 0.52, line: 't28', depth: 'shallow', isTransfer: true },
    { id: 'ot28d', name: 'Potiomkinski Skhody', nameUa: 'Потьомкінські сходи', x: 0.50, y: 0.40, line: 't28', depth: 'shallow', isTransfer: false },
    // Tram 18
    { id: 'ot18a', name: 'Port', nameUa: 'Порт', x: 0.55, y: 0.30, line: 't18', depth: 'shallow', isTransfer: false },
    { id: 'ot18b', name: 'Morska', nameUa: 'Морська', x: 0.48, y: 0.38, line: 't18', depth: 'shallow', isTransfer: false },
    { id: 'ot18c', name: 'Velykij Fontan', nameUa: 'Великий Фонтан', x: 0.65, y: 0.55, line: 't18', depth: 'shallow', isTransfer: false },
    { id: 'ot18d', name: 'Lanzheron', nameUa: 'Ланжерон', x: 0.60, y: 0.42, line: 't18', depth: 'shallow', isTransfer: false },
  ],
  startingStations: ['ot5c', 'ot5d', 'ot28b', 'ot28c', 'ot18a', 'ot18b'],
  unlockOrder: {
    t5: ['ot5b', 'ot5a'],
    t28: ['ot28a', 'ot28d'],
    t18: ['ot18c', 'ot18d'],
  },
  riverPoints: [
    { x: 0.85, y: 0.0 }, { x: 0.90, y: 0.30 }, { x: 0.88, y: 0.60 }, { x: 0.92, y: 1.0 },
  ],
  intercityConnections: [
    { targetCity: 'kyiv', travelTime: 55000, cost: 90 },
    { targetCity: 'dnipro', travelTime: 55000, cost: 85 },
  ],
  surfaceRoutes: [],
};

export const CITIES: Record<string, CityConfig> = {
  kyiv: KYIV,
  kharkiv: KHARKIV,
  dnipro: DNIPRO,
  lviv: LVIV,
  odesa: ODESA,
};

export function getCityConfig(id: string): CityConfig {
  return CITIES[id] || KYIV;
}

export const CITY_IDS = Object.keys(CITIES);
