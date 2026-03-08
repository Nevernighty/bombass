import React, { useState, useCallback } from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';
import { ProgressRing } from './ProgressRing';
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
  cooldown?: number; // 0-1 ratio
  color: string;
}

function ActionBtn({ icon, label, desc, cost, hotkey, onClick, disabled, active, cooldown, color }: ActionBtnProps) {
  const [showTip, setShowTip] = useState(false);
  const [pressed, setPressed] = useState(false);
  const insufficient = cost !== undefined && disabled;

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onClick();
  }, [disabled, onClick]);

  return (
    <div className="relative" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all
          ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          ${pressed ? 'scale-90' : ''}
          ${active ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}`}
        style={{
          background: active ? `${color}30` : `${color}12`,
          border: `2px solid ${active ? color : color + '40'}`,
          color,
          ringColor: active ? color : undefined,
          boxShadow: active ? `0 0 12px ${color}40` : 'none',
        }}
      >
        {icon}
        {/* Cooldown overlay */}
        {cooldown !== undefined && cooldown > 0 && (
          <ProgressRing progress={1 - cooldown} size={40} strokeWidth={2} color={color} bgColor="rgba(255,255,255,0.05)" />
        )}
      </button>

      {/* Cost badge */}
      {cost !== undefined && (
        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold px-1 rounded-full leading-tight"
          style={{
            background: insufficient ? 'hsl(0, 72%, 45%)' : 'hsl(145, 63%, 35%)',
            color: '#fff',
          }}>
          ${cost}
        </span>
      )}

      {/* Hotkey badge */}
      {hotkey && (
        <span className="absolute -top-1 -right-1 text-[8px] font-mono font-bold px-1 rounded"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
          {hotkey}
        </span>
      )}

      {/* Tooltip */}
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 animate-in fade-in-0 slide-in-from-bottom-1 duration-100"
          style={{ width: '160px' }}>
          <div className="rounded-lg px-2.5 py-1.5 text-left"
            style={{
              background: 'rgba(8, 12, 24, 0.98)',
              border: `1px solid ${color}40`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}>
            <p className="text-[11px] font-bold" style={{ color }}>{label}</p>
            <p className="text-[9px] leading-snug mt-0.5" style={{ color: 'rgba(180,190,210,0.7)' }}>{desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainBtn({ line, label, money, onClick, color }: {
  line: string; label: string; money: number; onClick: () => void; color: string;
}) {
  const [pressed, setPressed] = useState(false);
  const insufficient = money < GAME_CONFIG.TRAIN_COST;

  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 150); onClick(); }}
      disabled={insufficient}
      className={`flex flex-col items-center justify-center rounded-lg transition-all
        ${insufficient ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
        ${pressed ? 'scale-90' : ''}`}
      style={{
        width: '48px', height: '48px',
        border: `2px solid ${color}`,
        color,
        background: `${color}15`,
        boxShadow: insufficient ? 'none' : `0 0 10px ${color}25`,
      }}
    >
      <Train size={16} />
      <span className="text-[9px] font-bold leading-none mt-0.5">{label}</span>
      <span className="text-[8px] leading-none" style={{ color: insufficient ? '#ef4444' : 'rgba(180,190,210,0.6)' }}>
        ${GAME_CONFIG.TRAIN_COST}
      </span>
    </button>
  );
}

const Divider = () => <div className="w-px h-8 self-center" style={{ background: 'rgba(255,255,255,0.08)' }} />;

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
  onCloseSegment, onReopenLine,
}: ActionBarProps) {

  const lines: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];
  const hasClosedRed = closedSegments.some(s => s.line === 'red');
  const hasClosedBlue = closedSegments.some(s => s.line === 'blue');
  const hasClosedGreen = closedSegments.some(s => s.line === 'green');

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl backdrop-blur-md"
        style={{
          background: 'rgba(8, 12, 24, 0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
        {/* Train buttons */}
        <TrainBtn line="red" label="M1" money={money} onClick={() => onBuyTrain('red')} color={METRO_LINES.red.color} />
        <TrainBtn line="blue" label="M2" money={money} onClick={() => onBuyTrain('blue')} color={METRO_LINES.blue.color} />
        <TrainBtn line="green" label="M3" money={money} onClick={() => onBuyTrain('green')} color={METRO_LINES.green.color} />

        <Divider />

        {/* Defense */}
        <ActionBtn icon={<Radar size={16} />} label="Радар" desc="Раннє попередження дронів"
          cost={GAME_CONFIG.RADAR_COST} onClick={onBuyRadar}
          disabled={money < GAME_CONFIG.RADAR_COST || radarActive} active={radarActive} color="#38bdf8" />
        <ActionBtn icon={<Target size={16} />} label="Приманка" desc="Хибна ціль для дронів"
          cost={GAME_CONFIG.DECOY_COST} hotkey="T" onClick={onPlaceDecoy}
          disabled={money < GAME_CONFIG.DECOY_COST} color="#facc15" />
        <ActionBtn icon={<Crosshair size={16} />} label="Глушилка" desc="Уповільнює всі дрони"
          cost={GAME_CONFIG.DRONE_JAMMER_COST} onClick={onDroneJammer}
          disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
          cooldown={droneJammerTimer > 0 ? droneJammerTimer / 15000 : 0} color="#38bdf8" />
        <ActionBtn icon={<Zap size={16} />} label="Сигнальна ракета" desc="Підсвічує дрони та цілі"
          cost={GAME_CONFIG.SIGNAL_FLARE_COST} onClick={onSignalFlare}
          disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
          cooldown={signalFlareTimer > 0 ? signalFlareTimer / 10000 : 0} color="#facc15" />

        <Divider />

        {/* Economy */}
        <ActionBtn icon={<DollarSign size={16} />} label="x2 Тариф" desc="Подвійний дохід"
          cost={GAME_CONFIG.DOUBLE_FARE_COST} onClick={onDoubleFare}
          disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
          active={doubleFareTimer > 0} cooldown={doubleFareTimer > 0 ? doubleFareTimer / 20000 : 0} color="#4ade80" />
        <ActionBtn icon={<Users size={16} />} label="Десант" desc="Додає пасажирів"
          cost={GAME_CONFIG.PASSENGER_AIRDROP_COST} onClick={onPassengerAirdrop}
          disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST} color="#c084fc" />
        <ActionBtn icon={<AlertTriangle size={16} />} label="Екстрений фонд" desc="HP → гроші"
          onClick={onEmergencyFund} disabled={lives <= 1} color="#ef4444" />

        <Divider />

        {/* Emergency */}
        <ActionBtn icon={<RotateCcw size={16} />} label="Стоп" desc="Зупинити всі потяги"
          cost={GAME_CONFIG.EMERGENCY_BRAKE_COST} onClick={onEmergencyBrake}
          disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
          cooldown={emergencyBrakeTimer > 0 ? emergencyBrakeTimer / 8000 : 0} color="#ef4444" />
        <ActionBtn icon={<Moon size={16} />} label="Блекаут" desc="Дрони гірше бачать"
          onClick={onBlackout} active={blackoutMode} color="#94a3b8" />
        <ActionBtn icon={<Wrench size={16} />} label="Ремонт" desc="Ремонтники до станції"
          cost={GAME_CONFIG.REINFORCEMENT_COST} hotkey="R" onClick={onReinforcements}
          disabled={money < GAME_CONFIG.REINFORCEMENT_COST} color="#fb923c" />
        <ActionBtn icon={<Gauge size={16} />} label="Генератор" desc="Автономне живлення"
          cost={GAME_CONFIG.GENERATOR_COST} onClick={onBuyGenerator}
          disabled={money < GAME_CONFIG.GENERATOR_COST} color="#4ade80" />

        <Divider />

        {/* Network — close/open segments */}
        {lines.map(l => {
          const c = METRO_LINES[l].color;
          const isClosed = closedSegments.some(s => s.line === l);
          const label = l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3';
          return (
            <ActionBtn
              key={l}
              icon={isClosed ? <Unlock size={14} /> : <Lock size={14} />}
              label={isClosed ? `Відкрити ${label}` : `Закрити ${label}`}
              desc={isClosed ? 'Зняти блокування' : 'Блокувати сегмент (30с)'}
              cost={isClosed ? undefined : 15}
              onClick={() => isClosed ? onReopenLine(l) : onCloseSegment(l)}
              disabled={!isClosed && money < 15}
              active={isClosed}
              color={c}
            />
          );
        })}
      </div>
    </div>
  );
});
