import React, { useState, useRef, useCallback } from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';
import { ChevronUp } from 'lucide-react';

interface ActionBarProps {
  money: number;
  selectedTrain: string | null;
  selectedTrainLevel: number;
  radarActive: boolean;
  speedBoostCooldown: number;
  doubleFareTimer: number;
  expressTimer: number;
  blackoutMode: boolean;
  signalFlareTimer: number;
  droneJammerTimer: number;
  emergencyBrakeTimer: number;
  stationMagnetTimer: number;
  lives: number;
  closedSegments: { line: string; from: string; to: string; timer: number }[];
  onBuyTrain: (line: 'red' | 'blue' | 'green') => void;
  onReinforcements: () => void;
  onBuyGenerator: () => void;
  onBuyRadar: () => void;
  onPlaceDecoy: () => void;
  onSpeedBoost: (line: 'red' | 'blue' | 'green') => void;
  onEmergencyBrake: () => void;
  onDoubleFare: () => void;
  onExpressLine: (line: 'red' | 'blue' | 'green') => void;
  onBlackout: () => void;
  onSignalFlare: () => void;
  onPassengerAirdrop: () => void;
  onDroneJammer: () => void;
  onEmergencyFund: () => void;
  onCloseSegment: (line: 'red' | 'blue' | 'green') => void;
  onReopenLine: (line: 'red' | 'blue' | 'green') => void;
}

interface DropdownItem {
  label: string;
  fullName: string;
  desc: string;
  cost?: number;
  hotkey?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  timer?: number;
  accentColor?: string;
}

function DropdownGroup({ title, items, accentColor }: {
  title: string;
  items: DropdownItem[];
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  }, []);

  const activeCount = items.filter(i => i.active || (i.timer && i.timer > 0)).length;

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-all hover:brightness-125 cursor-pointer"
        style={{
          background: open ? `${accentColor}25` : 'transparent',
          border: `1px solid ${open ? accentColor + '80' : 'rgba(255,255,255,0.1)'}`,
          color: accentColor,
        }}
      >
        {title}
        <ChevronUp size={14} className={`transition-transform ${open ? '' : 'rotate-180'}`} style={{ opacity: 0.7 }} />
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center"
            style={{ background: accentColor, color: '#000', width: '18px', height: '18px' }}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
          style={{ minWidth: '280px' }}>
          <div className="rounded-lg p-2 flex flex-col gap-0.5 backdrop-blur-md"
            style={{
              background: 'rgba(8, 12, 24, 0.98)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
            {items.map((item, i) => (
              <DropdownItemBtn key={i} item={item} onClose={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItemBtn({ item, onClose }: { item: DropdownItem; onClose: () => void }) {
  const [pressed, setPressed] = useState(false);
  const timerSecs = item.timer && item.timer > 0 ? Math.ceil(item.timer / 1000) : null;

  return (
    <button
      onClick={() => {
        if (item.disabled) return;
        setPressed(true);
        setTimeout(() => setPressed(false), 200);
        item.onClick();
      }}
      disabled={item.disabled}
      className={`flex items-start gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-all
        ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${pressed ? 'scale-95' : ''}
        ${item.active ? 'ring-1' : ''}`}
      style={{
        background: item.active ? `${item.accentColor || '#fff'}15` : 'transparent',
        borderLeft: `3px solid ${item.disabled ? 'transparent' : (item.accentColor || 'rgba(255,255,255,0.2)')}`,
        borderColor: item.active ? item.accentColor : undefined,
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = item.active ? `${item.accentColor || '#fff'}15` : 'transparent';
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: item.accentColor || '#e0e0e0' }}>
            {item.fullName}
          </span>
          {timerSecs && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(var(--game-accent))', color: '#000' }}>
              {timerSecs}с
            </span>
          )}
        </div>
        <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'rgba(180, 190, 210, 0.8)' }}>
          {item.desc}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-0.5">
        {item.cost !== undefined && (
          <span className="text-[12px] font-mono font-bold" style={{ color: '#4ade80' }}>${item.cost}</span>
        )}
        {item.hotkey && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(180,190,210,0.7)' }}>
            {item.hotkey}
          </span>
        )}
      </div>
    </button>
  );
}

function TrainBtn({ line, money, onClick, color }: {
  line: string;
  money: number;
  onClick: () => void;
  color: string;
}) {
  const [pressed, setPressed] = useState(false);
  const insufficient = money < GAME_CONFIG.TRAIN_COST;

  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 200); onClick(); }}
      disabled={insufficient}
      className={`flex flex-col items-center justify-center rounded-md transition-all
        ${insufficient ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'}
        ${pressed ? 'scale-90' : ''}`}
      style={{
        width: '52px', height: '52px',
        border: `2px solid ${color}`,
        color,
        background: `${color}15`,
        boxShadow: insufficient ? 'none' : `0 0 12px ${color}30`,
      }}
    >
      <span className="text-[15px] font-black leading-none">{line}</span>
      <span className="text-[9px] leading-none mt-0.5" style={{ color: insufficient ? '#ef4444' : 'rgba(180,190,210,0.7)' }}>
        ${GAME_CONFIG.TRAIN_COST}
      </span>
    </button>
  );
}

export const ActionBar = React.memo(function ActionBar({
  money, selectedTrain, selectedTrainLevel,
  radarActive, speedBoostCooldown,
  doubleFareTimer, expressTimer, blackoutMode,
  signalFlareTimer, droneJammerTimer, emergencyBrakeTimer,
  stationMagnetTimer, lives,
  onBuyTrain, onReinforcements, onUpgradeTrain,
  onBuyGenerator, onBuyRadar, onPlaceDecoy, onSpeedBoost,
  onEmergencyBrake, onDoubleFare, onExpressLine,
  onBlackout, onSignalFlare, onPassengerAirdrop,
  onDroneJammer, onEmergencyFund, onTrainShield,
}: ActionBarProps) {

  const defenseItems: DropdownItem[] = [
    { label: 'РДР', fullName: 'Радар', desc: 'Раннє попередження про наближення дронів', cost: GAME_CONFIG.RADAR_COST, onClick: onBuyRadar, disabled: money < GAME_CONFIG.RADAR_COST || radarActive, active: radarActive, accentColor: '#38bdf8' },
    { label: 'ПРМ', fullName: 'Приманка', desc: 'Хибна ціль що відволікає ворожі дрони', cost: GAME_CONFIG.DECOY_COST, hotkey: 'T', onClick: onPlaceDecoy, disabled: money < GAME_CONFIG.DECOY_COST, accentColor: '#facc15' },
    { label: 'ГЛШ', fullName: 'Глушилка дронів', desc: 'Тимчасово уповільнює всі ворожі дрони', cost: GAME_CONFIG.DRONE_JAMMER_COST, onClick: onDroneJammer, disabled: money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0, timer: droneJammerTimer, accentColor: '#38bdf8' },
    { label: 'СГН', fullName: 'Сигнальна ракета', desc: 'Підсвічує всі дрони та їхні цілі', cost: GAME_CONFIG.SIGNAL_FLARE_COST, onClick: onSignalFlare, disabled: money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0, timer: signalFlareTimer, accentColor: '#facc15' },
  ];

  const economyItems: DropdownItem[] = [
    { label: 'x2$', fullName: 'Подвійний тариф', desc: 'Тимчасово подвоює дохід за пасажирів', cost: GAME_CONFIG.DOUBLE_FARE_COST, onClick: onDoubleFare, disabled: money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0, active: doubleFareTimer > 0, timer: doubleFareTimer, accentColor: '#4ade80' },
    { label: 'ДСТ', fullName: 'Десант пасажирів', desc: 'Додати пасажирів на випадкові станції', cost: GAME_CONFIG.PASSENGER_AIRDROP_COST, onClick: onPassengerAirdrop, disabled: money < GAME_CONFIG.PASSENGER_AIRDROP_COST, accentColor: '#c084fc' },
    { label: '-HP', fullName: 'Екстрений фонд', desc: 'Обміняти одне життя на поповнення бюджету', onClick: onEmergencyFund, disabled: lives <= 1, accentColor: '#ef4444' },
  ];

  const emergencyItems: DropdownItem[] = [
    { label: 'СТОП', fullName: 'Екстрене гальмування', desc: 'Зупинити всі потяги для безпеки', cost: GAME_CONFIG.EMERGENCY_BRAKE_COST, onClick: onEmergencyBrake, disabled: money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0, timer: emergencyBrakeTimer, accentColor: '#ef4444' },
    { label: 'НІЧ', fullName: 'Режим блекауту', desc: 'Дрони гірше бачать станції', onClick: onBlackout, active: blackoutMode, accentColor: '#94a3b8' },
    { label: 'РЕМ', fullName: 'Ремонтна бригада', desc: 'Ремонтники до найпошкодженішої станції', cost: GAME_CONFIG.REINFORCEMENT_COST, hotkey: 'R', onClick: onReinforcements, disabled: money < GAME_CONFIG.REINFORCEMENT_COST, accentColor: '#fb923c' },
    { label: 'ГЕН', fullName: 'Генератор', desc: 'Автономне живлення при блекауті', cost: GAME_CONFIG.GENERATOR_COST, onClick: onBuyGenerator, disabled: money < GAME_CONFIG.GENERATOR_COST, accentColor: '#4ade80' },
  ];

  const transportItems: DropdownItem[] = [];
  if (selectedTrain) {
    transportItems.push(
      { label: 'UP', fullName: 'Апгрейд потяга', desc: 'Більше місткість та швидкість', cost: GAME_CONFIG.UPGRADE_COST * selectedTrainLevel, onClick: onUpgradeTrain, disabled: money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel, accentColor: '#c084fc' },
      { label: 'ЩИТ', fullName: 'Щит потяга', desc: 'Тимчасовий захист від дронів', cost: 30, onClick: onTrainShield, disabled: money < 30, accentColor: '#38bdf8' },
    );
  }

  const divider = <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-md"
        style={{
          background: 'rgba(8, 12, 24, 0.98)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
        {/* Direct train buttons */}
        <TrainBtn line="M1" money={money} onClick={() => onBuyTrain('red')} color={METRO_LINES.red.color} />
        <TrainBtn line="M2" money={money} onClick={() => onBuyTrain('blue')} color={METRO_LINES.blue.color} />
        <TrainBtn line="M3" money={money} onClick={() => onBuyTrain('green')} color={METRO_LINES.green.color} />

        {transportItems.length > 0 && (
          <>
            {divider}
            <DropdownGroup title="Потяг" items={transportItems} accentColor="#c084fc" />
          </>
        )}

        {divider}
        <DropdownGroup title="Оборона" items={defenseItems} accentColor="#38bdf8" />
        {divider}
        <DropdownGroup title="Економіка" items={economyItems} accentColor="#4ade80" />
        {divider}
        <DropdownGroup title="Термінові" items={emergencyItems} accentColor="#fb923c" />
      </div>
    </div>
  );
});
