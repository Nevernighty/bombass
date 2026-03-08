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

function CooldownOverlay({ timer }: { timer: number }) {
  if (timer <= 0) return null;
  const secs = Math.ceil(timer / 1000);
  return (
    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-10"
      style={{ background: 'rgba(0,0,0,0.9)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', boxShadow: '0 0 6px rgba(251,191,36,0.3)' }}>
      {secs}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] uppercase tracking-widest mb-0.5 w-full text-center font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{children}</p>;
}

interface TooltipData {
  name: string;
  cost?: number;
  desc: string;
  hotkey?: string;
}

function ActionTooltip({ data, visible }: { data: TooltipData | null; visible: boolean }) {
  if (!visible || !data) return null;
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap animate-tooltip-in z-50 pointer-events-none"
      style={{ background: 'rgba(8,12,28,0.96)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-bold text-white">{data.name}</span>
        {data.cost !== undefined && <span style={{ color: '#22c55e' }}>{data.cost}💰</span>}
        {data.hotkey && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>{data.hotkey}</span>}
      </div>
      <p style={{ color: '#9ca3af' }}>{data.desc}</p>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(255,255,255,0.12)' }} />
    </div>
  );
}

function ActionBtn({ onClick, disabled, color, borderColor, children, active, timer, tooltip, insufficientMoney }: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  borderColor: string;
  children: React.ReactNode;
  active?: boolean;
  timer?: number;
  tooltip: TooltipData;
  insufficientMoney?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    onClick();
  }, [disabled, onClick]);

  return (
    <div className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <ActionTooltip data={tooltip} visible={hovered} />
      <button ref={btnRef} onClick={handleClick}
        disabled={disabled}
        className={`game-btn-hover px-2.5 py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-0 ${disabled ? 'game-btn-disabled' : ''} ${pressed ? 'animate-button-press' : ''}`}
        style={{
          color: insufficientMoney ? '#ef4444' : color,
          border: `1px solid ${active ? color : borderColor}`,
          background: active ? `${color}15` : 'transparent',
          boxShadow: active ? `0 0 10px ${color}30` : 'none',
          minWidth: '38px',
          '--glow-color': `${color}50`,
          animation: active ? 'glow-pulse 1.5s ease-in-out infinite' : undefined,
        } as React.CSSProperties}>
        <span className="text-sm leading-none">{children}</span>
        {tooltip.hotkey && <span className="text-[7px] mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{tooltip.hotkey}</span>}
      </button>
      {timer !== undefined && timer > 0 && <CooldownOverlay timer={timer} />}
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
  const divider = <div className="w-px self-stretch mx-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(8,12,28,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '880px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        {/* Transport */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Транспорт</SectionLabel>
          <div className="flex gap-0.5">
            {(['red', 'blue', 'green'] as const).map(line => (
              <div key={line} className="relative"
                >
                <button onClick={() => onBuyTrain(line)}
                  className={`game-btn-hover px-2.5 py-1.5 rounded-lg text-xs font-medium flex flex-col items-center ${money < GAME_CONFIG.TRAIN_COST ? 'game-btn-disabled' : ''}`}
                  style={{ background: METRO_LINES[line].color, color: '#fff', boxShadow: `0 2px 8px ${METRO_LINES[line].color}40` }}
                  disabled={money < GAME_CONFIG.TRAIN_COST}>
                  <span>🚇</span>
                  <span className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>Q</span>
                </button>
              </div>
            ))}
            {selectedTrain && (
              <>
                <ActionBtn onClick={onUpgradeTrain}
                  disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
                  insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
                  color="#a855f7" borderColor="rgba(168,85,247,0.3)"
                  tooltip={{ name: 'Покращити потяг', cost: GAME_CONFIG.UPGRADE_COST * selectedTrainLevel, desc: 'Більше місткість та швидкість' }}>
                  ⬆️
                </ActionBtn>
                <ActionBtn onClick={onTrainShield}
                  disabled={money < 30}
                  insufficientMoney={money < 30}
                  color="#3b82f6" borderColor="rgba(59,130,246,0.3)"
                  tooltip={{ name: 'Щит потяга', cost: 30, desc: 'Імунітет на 15 секунд' }}>
                  🛡️
                </ActionBtn>
              </>
            )}
          </div>
        </div>
        {divider}
        {/* Defense */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Оборона</SectionLabel>
          <div className="flex gap-0.5">
            <ActionBtn onClick={onBuyRadar} disabled={money < GAME_CONFIG.RADAR_COST || radarActive}
              color="#06b6d4" borderColor="rgba(6,182,212,0.2)"
              active={radarActive}
              tooltip={{ name: 'Радар', cost: GAME_CONFIG.RADAR_COST, desc: 'Показує цілі дронів' }}>
              📡
            </ActionBtn>
            <ActionBtn onClick={onPlaceDecoy} disabled={money < GAME_CONFIG.DECOY_COST}
              insufficientMoney={money < GAME_CONFIG.DECOY_COST}
              color="#f59e0b" borderColor="rgba(245,158,11,0.2)"
              tooltip={{ name: 'Приманка', cost: GAME_CONFIG.DECOY_COST, desc: 'Відволікає дрони', hotkey: 'T' }}>
              🎯
            </ActionBtn>
            <ActionBtn onClick={onDroneJammer} disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
              color="#06b6d4" borderColor="rgba(6,182,212,0.2)"
              timer={droneJammerTimer}
              tooltip={{ name: 'Глушилка', cost: GAME_CONFIG.DRONE_JAMMER_COST, desc: 'Уповільнює дрони' }}>
              📡🛑
            </ActionBtn>
            <ActionBtn onClick={onSignalFlare} disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
              color="#f59e0b" borderColor="rgba(245,158,11,0.2)"
              timer={signalFlareTimer}
              tooltip={{ name: 'Сигнальна ракета', cost: GAME_CONFIG.SIGNAL_FLARE_COST, desc: 'Показує маршрути дронів' }}>
              🔦
            </ActionBtn>
          </div>
        </div>
        {divider}
        {/* Economy */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Економіка</SectionLabel>
          <div className="flex gap-0.5">
            <ActionBtn onClick={onDoubleFare} disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
              color="#22c55e" borderColor="rgba(34,197,94,0.2)"
              active={doubleFareTimer > 0} timer={doubleFareTimer}
              tooltip={{ name: 'Подвійний тариф', cost: GAME_CONFIG.DOUBLE_FARE_COST, desc: 'x2 дохід 15 секунд' }}>
              💰x2
            </ActionBtn>
            <ActionBtn onClick={onPassengerAirdrop} disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
              insufficientMoney={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
              color="#8b5cf6" borderColor="rgba(139,92,246,0.2)"
              tooltip={{ name: 'Десант пасажирів', cost: GAME_CONFIG.PASSENGER_AIRDROP_COST, desc: 'Додає пасажирів на станції' }}>
              🪂
            </ActionBtn>
            <ActionBtn onClick={onEmergencyFund} disabled={lives <= 1}
              color="#ef4444" borderColor="rgba(239,68,68,0.2)"
              tooltip={{ name: 'Аварійний фонд', desc: '-1❤️ → +80💰' }}>
              💔→💰
            </ActionBtn>
          </div>
        </div>
        {divider}
        {/* Emergency */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Екстрені</SectionLabel>
          <div className="flex gap-0.5">
            <ActionBtn onClick={onEmergencyBrake} disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
              color="#ef4444" borderColor="rgba(239,68,68,0.2)"
              timer={emergencyBrakeTimer}
              tooltip={{ name: 'Гальмування', cost: GAME_CONFIG.EMERGENCY_BRAKE_COST, desc: 'Зупиняє всі потяги', hotkey: '' }}>
              🛑
            </ActionBtn>
            <ActionBtn onClick={onBlackout}
              color={blackoutMode ? '#fff' : '#9ca3af'}
              borderColor={blackoutMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
              active={blackoutMode}
              tooltip={{ name: 'Блекаут', desc: 'Вимикає вогні міста' }}>
              🌑
            </ActionBtn>
            <ActionBtn onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
              insufficientMoney={money < GAME_CONFIG.REINFORCEMENT_COST}
              color="#f97316" borderColor="rgba(249,115,22,0.2)"
              tooltip={{ name: 'Підкріплення', cost: GAME_CONFIG.REINFORCEMENT_COST, desc: 'Ремонтна бригада ДСНС', hotkey: 'R' }}>
              🚒
            </ActionBtn>
            <ActionBtn onClick={onBuyGenerator} disabled={money < GAME_CONFIG.GENERATOR_COST}
              insufficientMoney={money < GAME_CONFIG.GENERATOR_COST}
              color="#22c55e" borderColor="rgba(34,197,94,0.2)"
              tooltip={{ name: 'Генератор', cost: GAME_CONFIG.GENERATOR_COST, desc: 'Відновлює енергію' }}>
              ⚡
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
});
