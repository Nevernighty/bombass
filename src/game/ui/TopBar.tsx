import React from 'react';

interface TopBarProps {
  score: number;
  combo: number;
  money: number;
  lives: number;
  speedMultiplier: number;
  elapsedTime: number;
  passengersDelivered: number;
  dronesIntercepted: number;
  totalDrones: number;
  networkEfficiency: number;
  isNight: boolean;
  waveIndex: number;
  isAirRaid: boolean;
  powerGrid: number;
  maxPower: number;
  rushHourActive: boolean;
  radarActive: boolean;
  satisfactionRate: number;
  buildingsDestroyed: number;
  gameMode: string;
  winConditionMet: boolean;
  onSpeedChange: (mult: number) => void;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const TopBar = React.memo(function TopBar({
  score, combo, money, lives, speedMultiplier,
  elapsedTime, passengersDelivered, dronesIntercepted, totalDrones,
  networkEfficiency, isNight, waveIndex, isAirRaid,
  powerGrid, maxPower, rushHourActive, radarActive,
  satisfactionRate, buildingsDestroyed, gameMode, winConditionMet,
  onSpeedChange,
}: TopBarProps) {
  const powerPct = Math.round((powerGrid / maxPower) * 100);

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-2 pointer-events-none">
      <div className="pointer-events-auto px-3 py-2 rounded-lg" style={{ background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white font-bold text-base">{Math.round(score)}</span>
          <span style={{ color: combo >= 3 ? '#f59e0b' : '#eab308' }}>x{(Math.round(combo * 10) / 10).toFixed(1)}</span>
          <span style={{ color: '#22c55e' }}>💰{money}</span>
          <span>{'❤️'.repeat(Math.min(lives, 5))}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        </div>
        <div className="flex gap-1 mt-1 items-center flex-wrap">
          {[1, 2, 5, 10].map(s => (
            <button key={s} onClick={() => onSpeedChange(s)}
              className="px-2 py-0.5 rounded text-xs font-bold transition-colors"
              style={speedMultiplier === s
                ? { background: '#eab308', color: '#1a1a2e' }
                : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }
              }>
              {s}x
            </button>
          ))}
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded" style={{
            background: isAirRaid ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.05)',
            color: isAirRaid ? '#fca5a5' : '#9ca3af',
            border: isAirRaid ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            Хвиля {waveIndex + 1}
          </span>
          {rushHourActive && (
            <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'rgba(234,179,8,0.3)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.5)',
            }}>
              🚇 ПІК
            </span>
          )}
          {gameMode !== 'classic' && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
              {gameMode === 'rush_hour' ? '🚇' : gameMode === 'siege' ? '💣' : gameMode === 'blackout' ? '🌑' : '🌉'}
            </span>
          )}
          {winConditionMet && (
            <span className="text-xs font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'rgba(34,197,94,0.3)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.5)',
            }}>
              🎉 ПЕРЕМОГА
            </span>
          )}
        </div>
      </div>
      <div className="pointer-events-auto px-3 py-2 rounded-lg" style={{ background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#9ca3af' }}>
          <span>⏱ {formatTime(elapsedTime)}</span>
          <span>🚇 {passengersDelivered}</span>
          <span>🎯 {dronesIntercepted}/{totalDrones}</span>
          <span>📊 {networkEfficiency}%</span>
          <span>{isNight ? '🌙' : '☀️'}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs">
          <span style={{ color: powerPct < 20 ? '#ef4444' : powerPct < 50 ? '#f59e0b' : '#22c55e' }}>
            ⚡ {powerPct}%
          </span>
          <span style={{ color: satisfactionRate > 80 ? '#22c55e' : satisfactionRate > 50 ? '#f59e0b' : '#ef4444' }}>
            😊 {satisfactionRate}%
          </span>
          {buildingsDestroyed > 0 && <span style={{ color: '#ef4444' }}>🏚️ {buildingsDestroyed}</span>}
          {radarActive && <span style={{ color: '#06b6d4' }}>📡</span>}
        </div>
      </div>
    </div>
  );
});
