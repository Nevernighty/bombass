import { GameMode } from '../types';

export interface ScenarioConfig {
  id: GameMode;
  nameUa: string;
  nameEn: string;
  descriptionUa: string;
  descriptionEn: string;
  icon: string;
  difficulty: number; // 1-5
  startMoney: number;
  startLives: number;
  permanentNight: boolean;
  noRaids: boolean;
  continuousRaids: boolean;
  passengerMultiplier: number;
  powerDrainMultiplier: number;
  activeLines: string[];
  startTrains: number;
  winCondition: null | { type: 'passengers' | 'survive' | 'protect'; target: number };
  timeLimit: number | null; // ms, null = endless
  city?: string; // specific city, null = any
}

export const SCENARIOS: Record<GameMode, ScenarioConfig> = {
  classic: {
    id: 'classic',
    nameUa: 'Класична гра', nameEn: 'Classic Game',
    descriptionUa: 'Нескінченне виживання з хвилями ворогів.',
    descriptionEn: 'Endless survival with waves of enemies.',
    icon: '🏙️',
    difficulty: 3,
    startMoney: 50,
    startLives: 3,
    permanentNight: false,
    noRaids: false,
    continuousRaids: false,
    passengerMultiplier: 1,
    powerDrainMultiplier: 1,
    activeLines: ['red', 'blue', 'green'],
    startTrains: 3,
    winCondition: null,
    timeLimit: null,
  },
  rush_hour: {
    id: 'rush_hour',
    nameUa: 'Година Пік', nameEn: 'Rush Hour',
    descriptionUa: '5 хвилин, x3 пасажирів, без тривог. Доставте 300!',
    descriptionEn: '5 minutes, x3 passengers, no raids. Deliver 300!',
    icon: '🚇',
    difficulty: 2,
    startMoney: 100,
    startLives: 5,
    permanentNight: false,
    noRaids: true,
    continuousRaids: false,
    passengerMultiplier: 3,
    powerDrainMultiplier: 0.5,
    activeLines: ['red', 'blue', 'green'],
    startTrains: 6,
    winCondition: { type: 'passengers', target: 300 },
    timeLimit: 300000,
  },
  siege: {
    id: 'siege',
    nameUa: 'Облога', nameEn: 'Siege',
    descriptionUa: 'Безперервні атаки з першої секунди. Вижийте 10 хвилин!',
    descriptionEn: 'Non-stop attacks from second one. Survive 10 minutes!',
    icon: '💣',
    difficulty: 5,
    startMoney: 200,
    startLives: 5,
    permanentNight: false,
    noRaids: false,
    continuousRaids: true,
    passengerMultiplier: 1,
    powerDrainMultiplier: 1.5,
    activeLines: ['red', 'blue', 'green'],
    startTrains: 3,
    winCondition: { type: 'survive', target: 600000 },
    timeLimit: 600000,
  },
  blackout: {
    id: 'blackout',
    nameUa: 'Блекаут', nameEn: 'Blackout',
    descriptionUa: 'Вічна ніч, x3 витрати енергії. 150 пасажирів без втрат!',
    descriptionEn: 'Eternal night, x3 power drain. 150 passengers no losses!',
    icon: '🌑',
    difficulty: 4,
    startMoney: 80,
    startLives: 3,
    permanentNight: true,
    noRaids: false,
    continuousRaids: false,
    passengerMultiplier: 1,
    powerDrainMultiplier: 3,
    activeLines: ['red', 'blue', 'green'],
    startTrains: 3,
    winCondition: { type: 'passengers', target: 150 },
    timeLimit: null,
  },
  bridge_defense: {
    id: 'bridge_defense',
    nameUa: 'Оборона мосту', nameEn: 'Bridge Defense',
    descriptionUa: 'Тільки червона лінія. Захистіть міст 8 хвилин!',
    descriptionEn: 'Red line only. Defend the bridge for 8 minutes!',
    icon: '🌉',
    difficulty: 4,
    startMoney: 150,
    startLives: 3,
    permanentNight: false,
    noRaids: false,
    continuousRaids: false,
    passengerMultiplier: 1.5,
    powerDrainMultiplier: 1,
    activeLines: ['red'],
    startTrains: 2,
    winCondition: { type: 'protect', target: 480000 },
    timeLimit: 480000,
    city: 'kyiv',
  },
};

export const ACHIEVEMENT_DEFS = [
  { id: 'first_ride', nameUa: 'Перший рейс', nameEn: 'First Ride', icon: '🚇', condition: 'Доставте першого пасажира' },
  { id: 'hundred', nameUa: 'Сотня', nameEn: 'Century', icon: '💯', condition: '100 пасажирів доставлено' },
  { id: 'thousand', nameUa: 'Тисяча', nameEn: 'Thousand', icon: '🏆', condition: '1000 пасажирів доставлено' },
  { id: 'sniper', nameUa: 'Снайпер', nameEn: 'Sniper', icon: '🎯', condition: '10 дронів збито вручну' },
  { id: 'indestructible', nameUa: 'Неруйнівний', nameEn: 'Indestructible', icon: '🛡️', condition: '5 хвилин без втрати станції' },
  { id: 'combo_master', nameUa: 'Комбо Майстер', nameEn: 'Combo Master', icon: '⚡', condition: 'Досягніть комбо x5' },
  { id: 'full_line', nameUa: 'Повна лінія', nameEn: 'Full Line', icon: '🗺️', condition: 'Відкрийте всі станції лінії' },
  { id: 'three_lines', nameUa: 'Три лінії', nameEn: 'Three Lines', icon: '🚉', condition: 'Потяги на всіх лініях' },
  { id: 'economist', nameUa: 'Економіст', nameEn: 'Economist', icon: '💰', condition: 'Накопичте 500💰' },
  { id: 'rescuer', nameUa: 'Рятівник', nameEn: 'Rescuer', icon: '🔧', condition: 'Відремонтуйте 5 станцій' },
  { id: 'multi_city', nameUa: 'Подорожник', nameEn: 'Traveler', icon: '🗺️', condition: 'Відправте міжміський потяг' },
  { id: 'stability_master', nameUa: 'Стабільність', nameEn: 'Stability', icon: '📊', condition: 'Стабільність 80%+ протягом 2 хв' },
];
