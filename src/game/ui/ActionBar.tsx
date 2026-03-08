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
  onTrainShield: () => void;
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

function ActionBtn({ onClick, disabled, color, borderColor, title, hotkey, children, active, timer, maxTimer }: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  borderColor: string;
  title: string;
  hotkey?: string;
  children: React.ReactNode;
  active?: boolean;
  timer?: number;
  maxTimer?: number;
}) {
  return (
    <div className="relative" title={title}>
      <button onClick={onClick}
        disabled={disabled}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-125 disabled:opacity-30 flex flex-col items-center gap-0"
        style={{
          color,
          border: `1px solid ${active ? color : borderColor}`,
          background: active ? `${color}15` : 'transparent',
          boxShadow: active ? `0 0 8px ${color}30` : 'none',
          minWidth: '36px',
        }}>
        <span>{children}</span>
        {hotkey && <span className="text-[7px] mt-0.5" style={{ color: '#555' }}>{hotkey}</span>}
      </button>
      {timer !== undefined && maxTimer !== undefined && <CooldownOverlay timer={timer} maxTime={maxTimer} />}
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
  const divider = <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(10,15,30,0.94)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '850px' }}>
        {/* Transport */}
        <div className="flex flex-col items-center gap-0.5">
          <SectionLabel>Транспорт</SectionLabel>
          <div className="flex gap-0.5">
            {(['red', 'blue', 'green'] as const).map(line => (
              <button key={line} onClick={() => onBuyTrain(line)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-30 flex flex-col items-center"
                style={{ background: METRO_LINES[line].color, color: '#fff' }}
                disabled={money < GAME_CONFIG.TRAIN_COST}
                title={`Купити потяг (${GAME_CONFIG.TRAIN_COST}💰)`}>
                <span>🚇</span>
                <span className="text-[7px] mt-0.5">Q</span>
              </button>
            ))}
            {selectedTrain && (
              <>
                <ActionBtn onClick={onUpgradeTrain}
                  disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
                  color="#a855f7" borderColor="rgba(168,85,247,0.3)"
                  title={`Покращити потяг (${GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}💰)`}>
                  ⬆️
                </ActionBtn>
                <ActionBtn onClick={onTrainShield}
                  disabled={money < 30}
                  color="#3b82f6" borderColor="rgba(59,130,246,0.3)"
                  title="Щит потяга (30💰, 15с)">
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
              title={`Радар (${GAME_CONFIG.RADAR_COST}💰)`} active={radarActive}>
              📡
            </ActionBtn>
            <ActionBtn onClick={onPlaceDecoy} disabled={money < GAME_CONFIG.DECOY_COST}
              color="#f59e0b" borderColor="rgba(245,158,11,0.2)"
              title={`Приманка (${GAME_CONFIG.DECOY_COST}💰)`} hotkey="T">
              🎯
            </ActionBtn>
            <ActionBtn onClick={onDroneJammer} disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0}
              color="#06b6d4" borderColor="rgba(6,182,212,0.2)"
              title={`Глушилка (${GAME_CONFIG.DRONE_JAMMER_COST}💰)`}
              timer={droneJammerTimer} maxTimer={15000}>
              📡🛑
            </ActionBtn>
            <ActionBtn onClick={onSignalFlare} disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0}
              color="#f59e0b" borderColor="rgba(245,158,11,0.2)"
              title={`Сигнальна ракета (${GAME_CONFIG.SIGNAL_FLARE_COST}💰)`}
              timer={signalFlareTimer} maxTimer={10000}>
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
              title={`Подвійний тариф (${GAME_CONFIG.DOUBLE_FARE_COST}💰)`}
              active={doubleFareTimer > 0} timer={doubleFareTimer} maxTimer={15000}>
              💰x2
            </ActionBtn>
            <ActionBtn onClick={onPassengerAirdrop} disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST}
              color="#8b5cf6" borderColor="rgba(139,92,246,0.2)"
              title={`Пасажири (${GAME_CONFIG.PASSENGER_AIRDROP_COST}💰)`}>
              🪂
            </ActionBtn>
            <ActionBtn onClick={onEmergencyFund} disabled={lives <= 1}
              color="#ef4444" borderColor="rgba(239,68,68,0.2)"
              title="-1❤️ → +80💰">
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
              title={`Гальмування (${GAME_CONFIG.EMERGENCY_BRAKE_COST}💰)`}
              timer={emergencyBrakeTimer} maxTimer={5000}>
              🛑
            </ActionBtn>
            <ActionBtn onClick={onBlackout}
              color={blackoutMode ? '#fff' : '#9ca3af'}
              borderColor={blackoutMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}
              title="Блекаут" active={blackoutMode}>
              🌑
            </ActionBtn>
            <ActionBtn onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
              color="#f97316" borderColor="rgba(249,115,22,0.2)"
              title={`Підкріплення (${GAME_CONFIG.REINFORCEMENT_COST}💰)`} hotkey="R">
              🚒
            </ActionBtn>
            <ActionBtn onClick={onBuyGenerator} disabled={money < GAME_CONFIG.GENERATOR_COST}
              color="#22c55e" borderColor="rgba(34,197,94,0.2)"
              title={`Генератор (${GAME_CONFIG.GENERATOR_COST}💰)`}>
              ⚡
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
});
