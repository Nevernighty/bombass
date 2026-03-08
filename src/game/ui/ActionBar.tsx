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
  onBuyTrain: (line: 'red' | 'blue' | 'green') => void;
  onReinforcements: () => void;
  onUpgradeTrain: () => void;
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
  onTrainShield: () => void;
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
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const activeCount = items.filter(i => i.active || (i.timer && i.timer > 0)).length;

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all hover:brightness-125 cursor-pointer"
        style={{
          background: open ? `${accentColor}20` : 'transparent',
          border: `1px solid ${open ? accentColor + '60' : 'hsl(var(--border))'}`,
          color: accentColor,
        }}
      >
        {title}
        <ChevronUp size={12} className={`transition-transform ${open ? '' : 'rotate-180'}`} style={{ opacity: 0.6 }} />
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
            style={{ background: accentColor, color: '#000' }}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
          style={{ minWidth: '240px' }}>
          <div className="game-panel rounded-lg p-1.5 flex flex-col gap-0.5">
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
      className={`flex items-start gap-2 w-full px-2.5 py-2 rounded-md text-left transition-all
        ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/40 cursor-pointer'}
        ${pressed ? 'scale-95' : ''}
        ${item.active ? 'ring-1' : ''}`}
      style={{
        background: item.active ? `${item.accentColor || 'hsl(var(--foreground))'}10` : 'transparent',
        borderColor: item.active ? item.accentColor : 'transparent',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: item.accentColor || 'hsl(var(--foreground))' }}>
            {item.fullName}
          </span>
          {timerSecs && (
            <span className="text-[9px] font-mono px-1 rounded-full" style={{ background: 'hsl(var(--game-accent))', color: '#000' }}>
              {timerSecs}с
            </span>
          )}
        </div>
        <p className="text-[9px] leading-snug mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {item.desc}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {item.cost !== undefined && (
          <span className="text-[10px] font-mono" style={{ color: 'hsl(145, 63%, 49%)' }}>${item.cost}</span>
        )}
        {item.hotkey && (
          <span className="text-[8px] font-mono px-1 rounded" style={{ background: 'hsla(var(--muted), 0.5)', color: 'hsl(var(--muted-foreground))' }}>
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
        ${insufficient ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'}
        ${pressed ? 'scale-90' : ''}`}
      style={{
        width: '44px', height: '44px',
        border: `2px solid ${color}`,
        color,
        background: `${color}10`,
      }}
    >
      <span className="text-[13px] font-black leading-none">{line}</span>
      <span className="text-[8px] leading-none mt-0.5" style={{ color: insufficient ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
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
    { label: 'РДР', fullName: 'Радар', desc: 'Раннє попередження про наближення дронів', cost: GAME_CONFIG.RADAR_COST, onClick: onBuyRadar, disabled: money < GAME_CONFIG.RADAR_COST || radarActive, active: radarActive, accentColor: 'hsl(185, 80%, 45%)' },
    { label: 'ПРМ', fullName: 'Приманка', desc: 'Хибна ціль що відволікає ворожі дрони', cost: GAME_CONFIG.DECOY_COST, hotkey: 'T', onClick: onPlaceDecoy, disabled: money < GAME_CONFIG.DECOY_COST, accentColor: 'hsl(var(--game-accent))' },
    { label: 'ГЛШ', fullName: 'Глушилка дронів', desc: 'Тимчасово уповільнює всі ворожі дрони на карті', cost: GAME_CONFIG.DRONE_JAMMER_COST, onClick: onDroneJammer, disabled: money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0, timer: droneJammerTimer, accentColor: 'hsl(185, 80%, 45%)' },
    { label: 'СГН', fullName: 'Сигнальна ракета', desc: 'Підсвічує всі дрони та їхні цілі', cost: GAME_CONFIG.SIGNAL_FLARE_COST, onClick: onSignalFlare, disabled: money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0, timer: signalFlareTimer, accentColor: 'hsl(var(--game-accent))' },
  ];

  const economyItems: DropdownItem[] = [
    { label: 'x2$', fullName: 'Подвійний тариф', desc: 'Тимчасово подвоює дохід за кожного доставленого пасажира', cost: GAME_CONFIG.DOUBLE_FARE_COST, onClick: onDoubleFare, disabled: money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0, active: doubleFareTimer > 0, timer: doubleFareTimer, accentColor: 'hsl(145, 63%, 49%)' },
    { label: 'ДСТ', fullName: 'Десант пасажирів', desc: 'Додати пасажирів на випадкові станції для більшого доходу', cost: GAME_CONFIG.PASSENGER_AIRDROP_COST, onClick: onPassengerAirdrop, disabled: money < GAME_CONFIG.PASSENGER_AIRDROP_COST, accentColor: 'hsl(280, 60%, 65%)' },
    { label: '-HP', fullName: 'Екстрений фонд', desc: 'Обміняти одне життя на негайне поповнення бюджету', onClick: onEmergencyFund, disabled: lives <= 1, accentColor: 'hsl(var(--destructive))' },
  ];

  const emergencyItems: DropdownItem[] = [
    { label: 'СТОП', fullName: 'Екстрене гальмування', desc: 'Зупинити всі потяги для безпеки під час тривоги', cost: GAME_CONFIG.EMERGENCY_BRAKE_COST, onClick: onEmergencyBrake, disabled: money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0, timer: emergencyBrakeTimer, accentColor: 'hsl(var(--destructive))' },
    { label: 'НІЧ', fullName: 'Режим блекауту', desc: 'Вимкнути світло — дрони гірше бачать станції', onClick: onBlackout, active: blackoutMode, accentColor: 'hsl(var(--muted-foreground))' },
    { label: 'РЕМ', fullName: 'Ремонтна бригада', desc: 'Надіслати ремонтників до найпошкодженішої станції', cost: GAME_CONFIG.REINFORCEMENT_COST, hotkey: 'R', onClick: onReinforcements, disabled: money < GAME_CONFIG.REINFORCEMENT_COST, accentColor: 'hsl(25, 95%, 53%)' },
    { label: 'ГЕН', fullName: 'Генератор', desc: 'Забезпечити станцію автономним живленням при блекауті', cost: GAME_CONFIG.GENERATOR_COST, onClick: onBuyGenerator, disabled: money < GAME_CONFIG.GENERATOR_COST, accentColor: 'hsl(145, 63%, 49%)' },
  ];

  const transportItems: DropdownItem[] = [];
  if (selectedTrain) {
    transportItems.push(
      { label: 'UP', fullName: 'Апгрейд потяга', desc: 'Збільшити місткість та швидкість обраного потяга', cost: GAME_CONFIG.UPGRADE_COST * selectedTrainLevel, onClick: onUpgradeTrain, disabled: money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel, accentColor: 'hsl(280, 60%, 65%)' },
      { label: 'ЩИТ', fullName: 'Щит потяга', desc: 'Тимчасовий захист обраного потяга від пошкоджень дронів', cost: 30, onClick: onTrainShield, disabled: money < 30, accentColor: 'hsl(204, 70%, 53%)' },
    );
  }

  const divider = <div className="w-px self-stretch" style={{ background: 'hsl(var(--border))' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg game-panel">
        {/* Direct train buttons */}
        <TrainBtn line="M1" money={money} onClick={() => onBuyTrain('red')} color={METRO_LINES.red.color} />
        <TrainBtn line="M2" money={money} onClick={() => onBuyTrain('blue')} color={METRO_LINES.blue.color} />
        <TrainBtn line="M3" money={money} onClick={() => onBuyTrain('green')} color={METRO_LINES.green.color} />

        {transportItems.length > 0 && (
          <>
            {divider}
            <DropdownGroup title="Потяг" items={transportItems} accentColor="hsl(280, 60%, 65%)" />
          </>
        )}

        {divider}
        <DropdownGroup title="Оборона" items={defenseItems} accentColor="hsl(185, 80%, 45%)" />
        {divider}
        <DropdownGroup title="Економіка" items={economyItems} accentColor="hsl(145, 63%, 49%)" />
        {divider}
        <DropdownGroup title="Термінові" items={emergencyItems} accentColor="hsl(25, 95%, 53%)" />
      </div>
    </div>
  );
});
