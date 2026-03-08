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
  const sep = <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex gap-1 px-3 py-1.5 rounded-lg flex-wrap justify-center" style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '720px' }}>
        {/* Train purchase */}
        {(['red', 'blue', 'green'] as const).map(line => (
          <button key={line} onClick={() => onBuyTrain(line)}
            className="px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: METRO_LINES[line].color, color: '#fff' }}
            disabled={money < GAME_CONFIG.TRAIN_COST}
            title={`Купити потяг (${GAME_CONFIG.TRAIN_COST}💰)`}>
            🚇 {GAME_CONFIG.TRAIN_COST}
          </button>
        ))}
        {sep}
        {/* Core actions */}
        <button onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
          🚒 {GAME_CONFIG.REINFORCEMENT_COST}
        </button>
        <button onClick={onBuyGenerator} disabled={money < GAME_CONFIG.GENERATOR_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
          ⚡ {GAME_CONFIG.GENERATOR_COST}
        </button>
        <button onClick={onBuyRadar} disabled={money < GAME_CONFIG.RADAR_COST || radarActive}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
          📡 {GAME_CONFIG.RADAR_COST}
        </button>
        <button onClick={onPlaceDecoy} disabled={money < GAME_CONFIG.DECOY_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
          🎯 {GAME_CONFIG.DECOY_COST}
        </button>
        {sep}
        {/* Phase 5 actions */}
        <button onClick={onEmergencyBrake} disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          title="Екстрене гальмування 5с">
          🛑 {GAME_CONFIG.EMERGENCY_BRAKE_COST}
        </button>
        <button onClick={onDoubleFare} disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
          title="Подвійний тариф 15с">
          💰x2 {GAME_CONFIG.DOUBLE_FARE_COST}
        </button>
        <button onClick={onSignalFlare} disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
          title="Показати цілі дронів 10с">
          🔦 {GAME_CONFIG.SIGNAL_FLARE_COST}
        </button>
        <button onClick={onPassengerAirdrop} disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
          title="+3 пасажири на кожну станцію">
          🪂 {GAME_CONFIG.PASSENGER_AIRDROP_COST}
        </button>
        <button onClick={onDroneJammer} disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
          title="Дрони -50% швидкість 15с">
          📡🛑 {GAME_CONFIG.DRONE_JAMMER_COST}
        </button>
        <button onClick={onBlackout}
          className="px-2 py-1 rounded text-xs" style={{ color: blackoutMode ? '#fff' : '#9ca3af', border: `1px solid ${blackoutMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`, background: blackoutMode ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          title="Блекаут: дрони промахуються, менше пасажирів">
          🌑
        </button>
        <button onClick={onEmergencyFund} disabled={lives <= 1}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          title="-1❤️ → +80💰">
          💔→💰
        </button>
        {selectedTrain && (
          <button onClick={onUpgradeTrain}
            disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
            className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
            ⬆️ Потяг
          </button>
        )}
      </div>
    </div>
  );
});
