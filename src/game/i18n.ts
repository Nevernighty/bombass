import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Lang = 'ua' | 'en';

const translations: Record<string, Record<Lang, string>> = {
  // TopBar
  'topbar.wave': { ua: 'ХВИЛЯ', en: 'WAVE' },
  'topbar.victory': { ua: 'ПЕРЕМОГА', en: 'VICTORY' },
  'topbar.peak': { ua: 'ПІК', en: 'RUSH' },
  'topbar.stability': { ua: 'Стабільність', en: 'Stability' },
  'topbar.time': { ua: 'Час', en: 'Time' },
  'topbar.passengers': { ua: 'Пасажири', en: 'Passengers' },
  'topbar.drones': { ua: 'Дрони', en: 'Drones' },
  'topbar.energy': { ua: 'Енергія', en: 'Energy' },
  'topbar.satisfaction': { ua: 'Задоволеність', en: 'Satisfaction' },
  'topbar.destroyed': { ua: 'Зруйновано', en: 'Destroyed' },
  'topbar.map': { ua: 'КАРТА', en: 'MAP' },

  // ActionBar
  'action.trains': { ua: 'ПОТЯГИ', en: 'TRAINS' },
  'action.defense': { ua: 'ОБОРОНА', en: 'DEFENSE' },
  'action.economy': { ua: 'ЕКОНОМІКА', en: 'ECONOMY' },
  'action.emergency': { ua: 'АВАРІЙНЕ', en: 'EMERGENCY' },
  'action.network': { ua: 'МЕРЕЖА', en: 'NETWORK' },
  'action.radar': { ua: 'Радар', en: 'Radar' },
  'action.radar_desc': { ua: 'Раннє попередження дронів', en: 'Early drone warning' },
  'action.decoy': { ua: 'Приманка', en: 'Decoy' },
  'action.decoy_desc': { ua: 'Хибна ціль для дронів', en: 'False target for drones' },
  'action.jammer': { ua: 'Глушилка', en: 'Jammer' },
  'action.jammer_desc': { ua: 'Уповільнює всі дрони', en: 'Slows all drones' },
  'action.flare': { ua: 'Сигнальна ракета', en: 'Signal flare' },
  'action.flare_desc': { ua: 'Підсвічує дрони та цілі', en: 'Highlights drones & targets' },
  'action.double_fare': { ua: 'x2 Тариф', en: 'x2 Fare' },
  'action.double_fare_desc': { ua: 'Подвійний дохід', en: 'Double income' },
  'action.airdrop': { ua: 'Десант', en: 'Airdrop' },
  'action.airdrop_desc': { ua: 'Додає пасажирів', en: 'Adds passengers' },
  'action.emergency_fund': { ua: 'Екстрений фонд', en: 'Emergency fund' },
  'action.emergency_fund_desc': { ua: 'HP → гроші', en: 'HP → money' },
  'action.brake': { ua: 'Стоп', en: 'Stop' },
  'action.brake_desc': { ua: 'Зупинити всі потяги', en: 'Stop all trains' },
  'action.blackout': { ua: 'Блекаут', en: 'Blackout' },
  'action.blackout_desc': { ua: 'Дрони гірше бачать', en: 'Drones see worse' },
  'action.repair': { ua: 'Ремонт', en: 'Repair' },
  'action.repair_desc': { ua: 'Ремонтники до станції', en: 'Send repair crew' },
  'action.generator': { ua: 'Генератор', en: 'Generator' },
  'action.generator_desc': { ua: 'Автономне живлення', en: 'Autonomous power' },
  'action.close': { ua: 'Закрити', en: 'Close' },
  'action.open': { ua: 'Відкрити', en: 'Open' },
  'action.close_desc': { ua: 'Блокувати сегмент (30с)', en: 'Block segment (30s)' },
  'action.open_desc': { ua: 'Зняти блокування', en: 'Remove block' },

  // StationPanel
  'station.defense_tab': { ua: 'ОБОРОНА', en: 'DEFENSE' },
  'station.manage_tab': { ua: 'КЕРУВ.', en: 'MANAGE' },
  'station.info_tab': { ua: 'ІНФО', en: 'INFO' },
  'station.aa': { ua: 'Зенітка', en: 'AA Gun' },
  'station.sam': { ua: 'ЗРК', en: 'SAM' },
  'station.shield': { ua: 'Щит', en: 'Shield' },
  'station.fortify': { ua: 'Укріпл.', en: 'Fortify' },
  'station.emp': { ua: 'EMP', en: 'EMP' },
  'station.intercept': { ua: 'Перехопл.', en: 'Intercept' },
  'station.turret': { ua: 'Турель', en: 'Turret' },
  'station.upgrade': { ua: 'Рів.', en: 'Lv.' },
  'station.evacuate': { ua: 'Евакуація', en: 'Evacuate' },
  'station.close': { ua: 'Закрити', en: 'Close' },
  'station.open': { ua: 'Відкрити', en: 'Open' },
  'station.shelter_in': { ua: 'Укриття', en: 'Shelter' },
  'station.shelter_out': { ua: 'Вийти', en: 'Exit' },
  'station.seal': { ua: 'Герметиз.', en: 'Seal' },
  'station.speed': { ua: 'Приск.', en: 'Boost' },
  'station.express': { ua: 'Експрес', en: 'Express' },
  'station.magnet': { ua: 'Магніт', en: 'Magnet' },
  'station.deep': { ua: 'Глибока', en: 'Deep' },
  'station.shallow': { ua: 'Мілка', en: 'Shallow' },
  'station.line': { ua: 'Лінія', en: 'Line' },
  'station.depth': { ua: 'Глибина', en: 'Depth' },
  'station.level': { ua: 'Рівень', en: 'Level' },
  'station.capacity': { ua: 'Місткість', en: 'Capacity' },
  'station.income': { ua: 'Дохід', en: 'Income' },
  'station.hp': { ua: 'HP', en: 'HP' },
  'station.shelters': { ua: 'Укриття', en: 'Shelters' },
  'station.transfer': { ua: 'Пересадочна станція', en: 'Transfer station' },
  'station.pax': { ua: 'пас.', en: 'pax' },
  'station.per_del': { ua: '/дост.', en: '/del.' },
  'station.defense_label': { ua: 'Оборона', en: 'Defense' },

  // TrainPanel
  'train.reroute': { ua: 'Перемаршрутити', en: 'Reroute' },
  'train.reverse': { ua: 'Розворот', en: 'Reverse' },
  'train.upgrade': { ua: 'Апгрейд', en: 'Upgrade' },
  'train.shield': { ua: 'Щит', en: 'Shield' },
  'train.sell': { ua: 'Продати', en: 'Sell' },
  'train.merge': { ua: "Об'єднати", en: 'Merge' },
  'train.wagons': { ua: 'ваг.', en: 'cars' },
  'train.pax': { ua: 'пас.', en: 'pax' },

  // WorldMap
  'worldmap.title': { ua: 'УКРАЇНА', en: 'UKRAINE' },

  // CrossCityAlert
  'crosscity.go': { ua: 'Перейти', en: 'Go' },

  // Start screen
  'start.subtitle': { ua: 'Керуй транспортом українських міст під ворожими атаками. Будуй оборону, перевози пасажирів, захисти країну.', en: 'Manage transit across Ukrainian cities under enemy attacks. Build defenses, transport passengers, protect the country.' },
  'start.recommended': { ua: 'РЕКОМЕНД.', en: 'RECOMMENDED' },
  'start.easy': { ua: 'Легко', en: 'Easy' },
  'start.medium': { ua: 'Середньо', en: 'Medium' },
  'start.hard': { ua: 'Складно', en: 'Hard' },
  'start.hardcore': { ua: 'Хардкор', en: 'Hardcore' },
  'start.pax_goal': { ua: 'пас.', en: 'pax' },
  'start.survive': { ua: 'Вижити', en: 'Survive' },
  'start.defend': { ua: 'Захист', en: 'Defend' },
  'start.minutes': { ua: 'хв', en: 'min' },
  'start.endless': { ua: 'Нескінченний режим', en: 'Endless mode' },
  'start.controls_move': { ua: 'рух камери', en: 'camera move' },
  'start.controls_zoom': { ua: 'зум', en: 'zoom' },
  'start.controls_rotate': { ua: 'обертання', en: 'rotate' },
  'start.controls_click': { ua: 'взаємодія', en: 'interact' },
  'start.controls_pause': { ua: 'пауза', en: 'pause' },
  'start.controls_speed': { ua: 'швидкість гри', en: 'game speed' },
  'start.controls_quick': { ua: 'швидкі дії', en: 'quick actions' },
  'start.controls_camera': { ua: 'режими камери', en: 'camera modes' },

  // Game over
  'gameover.title': { ua: 'ГАМОВЕР', en: 'GAME OVER' },
  'gameover.victory': { ua: 'ПЕРЕМОГА', en: 'VICTORY' },
  'gameover.score': { ua: 'Рахунок', en: 'Score' },
  'gameover.time': { ua: 'Час', en: 'Time' },
  'gameover.passengers': { ua: 'Пасажирів', en: 'Passengers' },
  'gameover.drones_shot': { ua: 'Дронів збито', en: 'Drones shot' },
  'gameover.max_combo': { ua: 'Макс. комбо', en: 'Max combo' },
  'gameover.buildings': { ua: 'Будівлі', en: 'Buildings' },
  'gameover.achievements': { ua: 'Досягнення', en: 'Achievements' },
  'gameover.play_again': { ua: 'ГРАТИ ЗНОВУ', en: 'PLAY AGAIN' },

  // In-game banners
  'banner.air_raid': { ua: '⚠️ ПОВІТРЯНА ТРИВОГА ⚠️', en: '⚠️ AIR RAID ALERT ⚠️' },
  'banner.rush_hour': { ua: '🚇 ГОДИНА ПІК x3', en: '🚇 RUSH HOUR x3' },
  'banner.combo': { ua: 'КОМБО', en: 'COMBO' },
  'banner.pause': { ua: '⏸ ПАУЗА', en: '⏸ PAUSED' },
  'banner.draw_line': { ua: '🔗 Тягни до сірої станції щоб підключити', en: '🔗 Drag to a grey station to connect' },
  'banner.pending_stations': { ua: 'станц. чекають · клікни кінцеву станцію', en: 'stations waiting · click end station' },

  // Events
  'event.rush_surge': { ua: 'Хвиля пасажирів', en: 'Passenger surge' },
  'event.vip': { ua: 'VIP пасажир — дрони полюють!', en: 'VIP passenger — drones hunting!' },
  'event.power_flicker': { ua: 'Коливання живлення', en: 'Power flicker' },
  'event.emergency_evac': { ua: 'Екстрена евакуація', en: 'Emergency evacuation' },
  'event.power_surge': { ua: 'Енергосплеск +10HP!', en: 'Power surge +10HP!' },

  // Tooltip
  'tooltip.shield_click': { ua: 'Клік → Щит / Оборона', en: 'Click → Shield / Defense' },
  'tooltip.repair_click': { ua: 'Клік → Ремонт $10', en: 'Click → Repair $10' },
  'tooltip.drone_click': { ua: 'Клік → Збити', en: 'Click → Shoot down' },

  // Minimap
  'minimap.title': { ua: 'КАРТА', en: 'MAP' },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ua',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('game-lang') as Lang) || 'ua'; } catch { return 'ua'; }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('game-lang', l); } catch {}
  }, []);

  const t = useCallback((key: string) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.ua || key;
  }, [lang]);

  return React.createElement(LanguageContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return React.createElement('div', { className: `flex rounded-lg overflow-hidden ${className || ''}`, style: { border: '1px solid hsl(220 20% 16%)' } },
    React.createElement('button', {
      onClick: () => setLang('ua'),
      className: 'px-2 py-1 text-[10px] font-black transition-all cursor-pointer',
      style: lang === 'ua' ? { background: 'hsl(var(--game-accent))', color: 'hsl(var(--game-bg))' } : { background: 'transparent', color: 'hsl(var(--muted-foreground))' },
    }, '🇺🇦'),
    React.createElement('button', {
      onClick: () => setLang('en'),
      className: 'px-2 py-1 text-[10px] font-black transition-all cursor-pointer',
      style: lang === 'en' ? { background: 'hsl(var(--game-accent))', color: 'hsl(var(--game-bg))' } : { background: 'transparent', color: 'hsl(var(--muted-foreground))' },
    }, '🇬🇧'),
  );
}
