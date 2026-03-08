import React, { useState, useRef, useCallback } from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';

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

interface TooltipData {
  name: string;
  desc: string;
}

const TOOLTIPS: Record<string, TooltipData> = {
  M1: { name: 'Потяг M1', desc: 'Купити потяг для Святошинсько-Броварської лінії' },
  M2: { name: 'Потяг M2', desc: 'Купити потяг для Оболонсько-Теремківської лінії' },
  M3: { name: 'Потяг M3', desc: 'Купити потяг для Сирецько-Печерської лінії' },
  UP: { name: 'Апгрейд потяга', desc: 'Збільшити місткість та швидкість обраного потяга' },
  ЩИТ: { name: 'Щит потяга', desc: 'Тимчасовий захист потяга від пошкоджень' },
  РДР: { name: 'Радар', desc: 'Раннє попередження про наближення дронів' },
  ПРМ: { name: 'Приманка', desc: 'Розмістити хибну ціль що відволікає дрони' },
  ГЛШ: { name: 'Глушилка дронів', desc: 'Тимчасово уповільнює всі ворожі дрони' },
  СГН: { name: 'Сигнальна ракета', desc: 'Підсвічує всіх дронів на карті' },
  'x2$': { name: 'Подвійний тариф', desc: 'Тимчасово подвоює дохід за пасажирів' },
  ДСТ: { name: 'Десант пасажирів', desc: 'Додати пасажирів на випадкові станції' },
  '-HP': { name: 'Екстрений фонд', desc: 'Обміняти одне життя на гроші' },
  СТОП: { name: 'Екстрене гальмування', desc: 'Зупинити всі потяги для безпеки' },
  НІЧ: { name: 'Режим блекауту', desc: 'Вимкнути світло — дрони гірше бачать станції' },
  РЕМ: { name: 'Ремонтна бригада', desc: 'Надіслати ремонтників до пошкодженої станції' },
  ГЕН: { name: 'Генератор', desc: 'Забезпечити станцію автономним живленням' },
};

function ActionBtn({ onClick, disabled, label, cost, active, timer, hotkey, insufficientMoney, accentColor }: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  cost?: number;
  active?: boolean;
  timer?: number;
  hotkey?: string;
  insufficientMoney?: boolean;
  accentColor?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();
  const color = accentColor || 'hsl(var(--foreground))';

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    onClick();
  }, [disabled, onClick]);

  const handleMouseEnter = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
  }, []);

  const timerSecs = timer && timer > 0 ? Math.ceil(timer / 1000) : null;
  const tip = TOOLTIPS[label];

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button onClick={handleClick} disabled={disabled}
        className={`relative flex flex-col items-center justify-center gap-0 rounded-md transition-all
          ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'}
          ${pressed ? 'scale-90' : ''}
          ${active ? 'ring-1' : ''}`}
        style={{
          width: '40px',
          height: '40px',
          background: active ? `${color}15` : 'transparent',
          border: `1px solid ${active ? `${color}40` : 'hsl(var(--border))'}`,
          color: insufficientMoney ? 'hsl(var(--destructive))' : color,
          boxShadow: active ? `0 0 8px ${color}20` : 'none',
        } as React.CSSProperties}>
        <span className="text-[11px] font-bold leading-none">{label}</span>
        {cost !== undefined && (
          <span className="text-[8px] leading-none mt-0.5" style={{ color: insufficientMoney ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
            ${cost}
          </span>
        )}
        {hotkey && (
          <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5 }}>{hotkey}</span>
        )}
        {timerSecs && (
          <span className="absolute -top-1 -right-1 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center"
            style={{ background: 'hsl(var(--game-bg))', color: 'hsl(var(--game-accent))', border: '1px solid hsl(var(--game-accent))' }}>
            {timerSecs}
          </span>
        )}
      </button>

      {/* Rich tooltip */}
      {showTooltip && tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
          style={{ width: '180px' }}>
          <div className="game-panel rounded-lg px-3 py-2 text-left">
            <p className="text-[12px] font-bold mb-0.5" style={{ color: 'hsl(var(--foreground))' }}>{tip.name}</p>
            <p className="text-[10px] leading-snug mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{tip.desc}</p>
            <div className="flex items-center justify-between">
              {cost !== undefined && (
                <span className="text-[10px] font-mono" style={{ color: 'hsl(145, 63%, 49%)' }}>${cost}</span>
              )}
              {hotkey && (
                <span className="text-[9px] font-mono px-1 rounded" style={{ background: 'hsla(var(--muted), 0.5)', color: 'hsl(var(--muted-foreground))' }}>{hotkey}</span>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 rotate-45 mx-auto -mt-1" style={{ background: 'hsla(var(--game-glass), 0.9)', borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} />
        </div>
      )}
    </div>
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
  const divider = <div className="w-px self-stretch" style={{ background: 'hsl(var(--border))' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg game-panel">
        {/* Transport */}
        {(['red', 'blue', 'green'] as const).map(line => (
          <ActionBtn key={line} onClick={() => onBuyTrain(line)}
            disabled={money < GAME_CONFIG.TRAIN_COST}
            insufficientMoney={money < GAME_CONFIG.TRAIN_COST}
            label={line === 'red' ? 'M1' : line === 'blue' ? 'M2' : 'M3'}
            cost={GAME_CONFIG.TRAIN_COST}
            hotkey="Q"
            accentColor={METRO_LINES[line].color} />
        ))}
        {selectedTrain && (
          <>
            <ActionBtn onClick={onUpgradeTrain}
              disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
              insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
              label="UP" cost={GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
              accentColor="hsl(280, 60%, 65%)" />
            <ActionBtn onClick={onTrainShield}
              disabled={money < 30}
              insufficientMoney={money < 30}
              label="ЩИТ" cost={30}
              accentColor="hsl(204, 70%, 53%)" />
          </>
        )}
        {divider}

        {/* Defense */}
        <ActionBtn onClick={onBuyRadar} disabled={money < GAME_CONFIG.RADAR_COST || radarActive}
          label="РДР" cost={GAME_CONFIG.RADAR_COST} active={radarActive}
          accentColor="hsl(185, 80%, 45%)" />
        <ActionBtn onClick={onPlaceDecoy} disabled={money < GAME_CONFIG.DECOY_COST}
          insufficientMoney={money < GAME_CONFIG.DECOY_COST}
          label="ПРМ" cost={GAME_CONFIG.DECOY_COST} hotkey="T"
          accentColor="hsl(var(--game-accent))" />
        <ActionBtn onClick={onDroneJammer} disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
          label="ГЛШ" cost={GAME_CONFIG.DRONE_JAMMER_COST} timer={droneJammerTimer}
          accentColor="hsl(185, 80%, 45%)" />
        <ActionBtn onClick={onSignalFlare} disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
          label="СГН" cost={GAME_CONFIG.SIGNAL_FLARE_COST} timer={signalFlareTimer}
          accentColor="hsl(var(--game-accent))" />
        {divider}

        {/* Economy */}
        <ActionBtn onClick={onDoubleFare} disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
          label="x2$" cost={GAME_CONFIG.DOUBLE_FARE_COST} active={doubleFareTimer > 0} timer={doubleFareTimer}
          accentColor="hsl(145, 63%, 49%)" />
        <ActionBtn onClick={onPassengerAirdrop} disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
          insufficientMoney={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
          label="ДСТ" cost={GAME_CONFIG.PASSENGER_AIRDROP_COST}
          accentColor="hsl(280, 60%, 65%)" />
        <ActionBtn onClick={onEmergencyFund} disabled={lives <= 1}
          label="-HP" accentColor="hsl(var(--destructive))" />
        {divider}

        {/* Emergency */}
        <ActionBtn onClick={onEmergencyBrake} disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
          label="СТОП" cost={GAME_CONFIG.EMERGENCY_BRAKE_COST} timer={emergencyBrakeTimer}
          accentColor="hsl(var(--destructive))" />
        <ActionBtn onClick={onBlackout}
          label="НІЧ" active={blackoutMode}
          accentColor="hsl(var(--muted-foreground))" />
        <ActionBtn onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
          insufficientMoney={money < GAME_CONFIG.REINFORCEMENT_COST}
          label="РЕМ" cost={GAME_CONFIG.REINFORCEMENT_COST} hotkey="R"
          accentColor="hsl(25, 95%, 53%)" />
        <ActionBtn onClick={onBuyGenerator} disabled={money < GAME_CONFIG.GENERATOR_COST}
          insufficientMoney={money < GAME_CONFIG.GENERATOR_COST}
          label="ГЕН" cost={GAME_CONFIG.GENERATOR_COST}
          accentColor="hsl(145, 63%, 49%)" />
      </div>
    </div>
  );
});