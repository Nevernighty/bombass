import React, { useState, useCallback } from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';
import {
  Train, Shield, Radar, Target, Zap, DollarSign, Users, AlertTriangle,
  Wrench, Moon, Gauge, Package, Crosshair, RotateCcw, Lock, Unlock, Rocket
} from 'lucide-react';

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
  onHover?: () => void;
}

interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  cost?: number;
  hotkey?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  cooldown?: number;
  color: string;
  onHoverSound?: () => void;
}

function ActionBtn({ icon, label, desc, cost, hotkey, onClick, disabled, active, cooldown, color, onHoverSound }: ActionBtnProps) {
  const [showTip, setShowTip] = useState(false);
  const [pressed, setPressed] = useState(false);
  const insufficient = cost !== undefined && disabled;

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onClick();
  }, [disabled, onClick]);

  const hasCooldown = cooldown !== undefined && cooldown > 0;
  const cooldownPct = hasCooldown ? Math.round((1 - cooldown) * 100) : 100;

  return (
    <div className="relative" onMouseEnter={() => { setShowTip(true); onHoverSound?.(); }} onMouseLeave={() => setShowTip(false)}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="relative flex items-center justify-center transition-all"
        style={{
          width: 40, height: 40,
          borderRadius: 10,
          background: active
            ? `color-mix(in srgb, ${color} 20%, hsl(225 45% 7%))`
            : 'hsl(225 40% 8% / 1)',
          border: `2px solid ${active ? color : 'hsl(220 20% 16% / 1)'}`,
          color: disabled ? 'hsl(220 10% 30%)' : color,
          boxShadow: active ? `0 0 16px ${color}30, inset 0 0 8px ${color}10` : '0 2px 8px rgba(0,0,0,0.3)',
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transform: pressed ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(1.12) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        {icon}
        {/* Conic cooldown sweep */}
        {hasCooldown && (
          <div className="absolute inset-0 rounded-[10px] overflow-hidden pointer-events-none" style={{
            background: `conic-gradient(transparent ${cooldownPct}%, rgba(0,0,0,0.6) ${cooldownPct}%)`,
          }} />
        )}
        {/* Active ring pulse */}
        {active && (
          <div className="absolute inset-[-3px] rounded-[12px] pointer-events-none animate-breath-glow" style={{
            border: `1px solid ${color}40`,
          }} />
        )}
      </button>

      {/* Cost badge */}
      {cost !== undefined && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap"
          style={{
            background: insufficient ? 'hsl(0 72% 40%)' : 'hsl(145 55% 30%)',
            color: '#fff',
            border: '1px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}>
          ${cost}
        </span>
      )}

      {/* Hotkey badge */}
      {hotkey && (
        <span className="kbd-key absolute -top-1.5 -right-1.5">{hotkey}</span>
      )}

      {/* Tooltip */}
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none z-50"
          style={{ width: '170px', animation: 'slide-up-fade 0.15s ease-out' }}>
          <div className="rounded-lg px-3 py-2 text-left" style={{
            background: 'hsl(225 45% 6% / 1)',
            border: `1px solid ${color}30`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.7), 0 0 12px ${color}10`,
          }}>
            <p className="text-[11px] font-black" style={{ color }}>{label}</p>
            <p className="text-[9px] leading-snug mt-0.5" style={{ color: 'hsl(220 10% 55%)' }}>{desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainBtn({ line, label, money, onClick, color, onHoverSound }: {
  line: string; label: string; money: number; onClick: () => void; color: string; onHoverSound?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const insufficient = money < GAME_CONFIG.TRAIN_COST;

  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 150); onClick(); }}
      disabled={insufficient}
      className="flex flex-col items-center justify-center transition-all"
      style={{
        width: 50, height: 50,
        borderRadius: 10,
        border: `2px solid ${color}`,
        color,
        background: `color-mix(in srgb, ${color} 8%, hsl(225 45% 7%))`,
        boxShadow: insufficient ? 'none' : `0 2px 12px ${color}20`,
        opacity: insufficient ? 0.3 : 1,
        cursor: insufficient ? 'not-allowed' : 'pointer',
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!insufficient) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1) translateY(-2px)'; onHoverSound?.(); }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      <Train size={16} />
      <span className="text-[9px] font-black leading-none mt-0.5">{label}</span>
      <span className="text-[7px] leading-none mt-0.5 font-bold" style={{
        color: insufficient ? 'hsl(0 72% 55%)' : 'hsl(220 10% 50%)',
      }}>
        ${GAME_CONFIG.TRAIN_COST}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label text-center w-full">{children}</div>;
}

function GroupDivider() {
  return <div className="game-divider h-10 self-center mx-0.5" />;
}

export const ActionBar = React.memo(function ActionBar({
  money, radarActive, speedBoostCooldown,
  doubleFareTimer, expressTimer, blackoutMode,
  signalFlareTimer, droneJammerTimer, emergencyBrakeTimer,
  stationMagnetTimer, lives, closedSegments,
  onBuyTrain, onReinforcements,
  onBuyGenerator, onBuyRadar, onPlaceDecoy, onSpeedBoost,
  onEmergencyBrake, onDoubleFare, onExpressLine,
  onBlackout, onSignalFlare, onPassengerAirdrop,
  onDroneJammer, onEmergencyFund,
  onCloseSegment, onReopenLine, onHover,
}: ActionBarProps) {

  const lines: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex items-end gap-2 px-4 py-3 rounded-2xl relative overflow-hidden"
        style={{
          background: 'hsl(225 45% 5% / 1)',
          border: '1px solid hsl(220 20% 14% / 1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
        {/* Top gradient highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--game-accent) / 0.3), transparent)',
        }} />

        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none rounded-2xl" />

        {/* ПОТЯГИ group */}
        <div className="flex flex-col items-center gap-1">
          <SectionLabel>ПОТЯГИ</SectionLabel>
          <div className="flex items-center gap-1.5">
            <TrainBtn line="red" label="M1" money={money} onClick={() => onBuyTrain('red')} color={METRO_LINES.red.color} onHoverSound={onHover} />
            <TrainBtn line="blue" label="M2" money={money} onClick={() => onBuyTrain('blue')} color={METRO_LINES.blue.color} onHoverSound={onHover} />
            <TrainBtn line="green" label="M3" money={money} onClick={() => onBuyTrain('green')} color={METRO_LINES.green.color} onHoverSound={onHover} />
          </div>
        </div>

        <GroupDivider />

        {/* ОБОРОНА group */}
        <div className="flex flex-col items-center gap-1">
          <SectionLabel>ОБОРОНА</SectionLabel>
          <div className="flex items-center gap-1.5">
            <ActionBtn icon={<Radar size={16} />} label="Радар" desc="Раннє попередження дронів"
              cost={GAME_CONFIG.RADAR_COST} onClick={onBuyRadar}
              disabled={money < GAME_CONFIG.RADAR_COST || radarActive} active={radarActive} color="#38bdf8" onHoverSound={onHover} />
            <ActionBtn icon={<Target size={16} />} label="Приманка" desc="Хибна ціль для дронів"
              cost={GAME_CONFIG.DECOY_COST} hotkey="T" onClick={onPlaceDecoy}
              disabled={money < GAME_CONFIG.DECOY_COST} color="#facc15" onHoverSound={onHover} />
            <ActionBtn icon={<Crosshair size={16} />} label="Глушилка" desc="Уповільнює всі дрони"
              cost={GAME_CONFIG.DRONE_JAMMER_COST} onClick={onDroneJammer}
              disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
              cooldown={droneJammerTimer > 0 ? droneJammerTimer / 15000 : 0} color="#38bdf8" onHoverSound={onHover} />
            <ActionBtn icon={<Zap size={16} />} label="Сигнальна ракета" desc="Підсвічує дрони та цілі"
              cost={GAME_CONFIG.SIGNAL_FLARE_COST} onClick={onSignalFlare}
              disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
              cooldown={signalFlareTimer > 0 ? signalFlareTimer / 10000 : 0} color="#facc15" onHoverSound={onHover} />
          </div>
        </div>

        <GroupDivider />

        {/* ЕКОНОМІКА group */}
        <div className="flex flex-col items-center gap-1">
          <SectionLabel>ЕКОНОМІКА</SectionLabel>
          <div className="flex items-center gap-1.5">
            <ActionBtn icon={<DollarSign size={16} />} label="x2 Тариф" desc="Подвійний дохід"
              cost={GAME_CONFIG.DOUBLE_FARE_COST} onClick={onDoubleFare}
              disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
              active={doubleFareTimer > 0} cooldown={doubleFareTimer > 0 ? doubleFareTimer / 20000 : 0} color="#4ade80" onHoverSound={onHover} />
            <ActionBtn icon={<Users size={16} />} label="Десант" desc="Додає пасажирів"
              cost={GAME_CONFIG.PASSENGER_AIRDROP_COST} onClick={onPassengerAirdrop}
              disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST} color="#c084fc" onHoverSound={onHover} />
            <ActionBtn icon={<AlertTriangle size={16} />} label="Екстрений фонд" desc="HP → гроші"
              onClick={onEmergencyFund} disabled={lives <= 1} color="#ef4444" onHoverSound={onHover} />
          </div>
        </div>

        <GroupDivider />

        {/* АВАРІЙНЕ group */}
        <div className="flex flex-col items-center gap-1">
          <SectionLabel>АВАРІЙНЕ</SectionLabel>
          <div className="flex items-center gap-1.5">
            <ActionBtn icon={<RotateCcw size={16} />} label="Стоп" desc="Зупинити всі потяги"
              cost={GAME_CONFIG.EMERGENCY_BRAKE_COST} onClick={onEmergencyBrake}
              disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
              cooldown={emergencyBrakeTimer > 0 ? emergencyBrakeTimer / 8000 : 0} color="#ef4444" onHoverSound={onHover} />
            <ActionBtn icon={<Moon size={16} />} label="Блекаут" desc="Дрони гірше бачать"
              onClick={onBlackout} active={blackoutMode} color="#94a3b8" onHoverSound={onHover} />
            <ActionBtn icon={<Wrench size={16} />} label="Ремонт" desc="Ремонтники до станції"
              cost={GAME_CONFIG.REINFORCEMENT_COST} hotkey="R" onClick={onReinforcements}
              disabled={money < GAME_CONFIG.REINFORCEMENT_COST} color="#fb923c" onHoverSound={onHover} />
            <ActionBtn icon={<Gauge size={16} />} label="Генератор" desc="Автономне живлення"
              cost={GAME_CONFIG.GENERATOR_COST} onClick={onBuyGenerator}
              disabled={money < GAME_CONFIG.GENERATOR_COST} color="#4ade80" onHoverSound={onHover} />
          </div>
        </div>

        <GroupDivider />

        {/* МЕРЕЖА group */}
        <div className="flex flex-col items-center gap-1">
          <SectionLabel>МЕРЕЖА</SectionLabel>
          <div className="flex items-center gap-1.5">
            {lines.map(l => {
              const c = METRO_LINES[l].color;
              const isClosed = closedSegments.some(s => s.line === l);
              const lineLabel = l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3';
              return (
                <ActionBtn
                  key={l}
                  icon={isClosed ? <Unlock size={14} /> : <Lock size={14} />}
                  label={isClosed ? `Відкрити ${lineLabel}` : `Закрити ${lineLabel}`}
                  desc={isClosed ? 'Зняти блокування' : 'Блокувати сегмент (30с)'}
                  cost={isClosed ? undefined : 15}
                  onClick={() => isClosed ? onReopenLine(l) : onCloseSegment(l)}
                  disabled={!isClosed && money < 15}
                  active={isClosed}
                  color={c}
                  onHoverSound={onHover}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
