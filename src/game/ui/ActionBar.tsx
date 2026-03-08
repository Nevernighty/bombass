import React from 'react';
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
}

function CooldownOverlay({ timer, maxTime }: { timer: number; maxTime: number }) {
  if (timer <= 0) return null;
  const secs = Math.ceil(timer / 1000);
  return (
    <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
      {secs}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] uppercase tracking-wider mb-0.5 w-full text-center" style={{ color: '#4b5563' }}>{children}</p>;
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
  onDroneJammer, onEmergencyFund,
}: ActionBarProps) {
  const divider = <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(10,15,30,0.94)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '780px' }}>
        {/* Transport */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Транспорт</SectionLabel>
          <div className="flex gap-0.5">
            {(['red', 'blue', 'green'] as const).map(line => (
              <button key={line} onClick={() => onBuyTrain(line)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background: METRO_LINES[line].color, color: '#fff' }}
                disabled={money < GAME_CONFIG.TRAIN_COST}
                title={`Купити потяг (${GAME_CONFIG.TRAIN_COST}💰)`}>
                🚇
              </button>
            ))}
            {selectedTrain && (
              <button onClick={onUpgradeTrain}
                disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                ⬆️
              </button>
            )}
          </div>
        </div>
        {divider}
        {/* Defense */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Оборона</SectionLabel>
          <div className="flex gap-0.5">
            <button onClick={onBuyRadar} disabled={money < GAME_CONFIG.RADAR_COST || radarActive}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
              title={`Радар (${GAME_CONFIG.RADAR_COST}💰)`}>
              📡
            </button>
            <button onClick={onPlaceDecoy} disabled={money < GAME_CONFIG.DECOY_COST}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              title={`Приманка (${GAME_CONFIG.DECOY_COST}💰)`}>
              🎯
            </button>
            <div className="relative">
              <button onClick={onDroneJammer} disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
                title={`Глушилка (${GAME_CONFIG.DRONE_JAMMER_COST}💰)`}>
                📡🛑
              </button>
              <CooldownOverlay timer={droneJammerTimer} maxTime={15000} />
            </div>
            <div className="relative">
              <button onClick={onSignalFlare} disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                title={`Сигнальна ракета (${GAME_CONFIG.SIGNAL_FLARE_COST}💰)`}>
                🔦
              </button>
              <CooldownOverlay timer={signalFlareTimer} maxTime={10000} />
            </div>
          </div>
        </div>
        {divider}
        {/* Economy */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Економіка</SectionLabel>
          <div className="flex gap-0.5">
            <div className="relative">
              <button onClick={onDoubleFare} disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                title={`Подвійний тариф (${GAME_CONFIG.DOUBLE_FARE_COST}💰)`}>
                💰x2
              </button>
              <CooldownOverlay timer={doubleFareTimer} maxTime={15000} />
            </div>
            <button onClick={onPassengerAirdrop} disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
              title={`Пасажири (${GAME_CONFIG.PASSENGER_AIRDROP_COST}💰)`}>
              🪂
            </button>
            <button onClick={onEmergencyFund} disabled={lives <= 1}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              title="-1❤️ → +80💰">
              💔→💰
            </button>
          </div>
        </div>
        {divider}
        {/* Emergency */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Екстрені</SectionLabel>
          <div className="flex gap-0.5">
            <div className="relative">
              <button onClick={onEmergencyBrake} disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                title={`Гальмування (${GAME_CONFIG.EMERGENCY_BRAKE_COST}💰)`}>
                🛑
              </button>
              <CooldownOverlay timer={emergencyBrakeTimer} maxTime={5000} />
            </div>
            <button onClick={onBlackout}
              className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: blackoutMode ? '#fff' : '#9ca3af', border: `1px solid ${blackoutMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`, background: blackoutMode ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              title="Блекаут">
              🌑
            </button>
            <button onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}
              title={`Підкріплення (${GAME_CONFIG.REINFORCEMENT_COST}💰)`}>
              🚒
            </button>
            <button onClick={onBuyGenerator} disabled={money < GAME_CONFIG.GENERATOR_COST}
              className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
              title={`Генератор (${GAME_CONFIG.GENERATOR_COST}💰)`}>
              ⚡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
