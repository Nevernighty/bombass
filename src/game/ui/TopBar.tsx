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
  networkEfficiency, isNight, waveIndex, isAirRaid, onSpeedChange,
}: TopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-2 pointer-events-none">
      <div className="pointer-events-auto px-3 py-2 rounded-lg" style={{ background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white font-bold text-base">{Math.round(score)}</span>
          <span style={{ color: '#eab308' }}>x{(Math.round(combo * 10) / 10).toFixed(1)}</span>
          <span style={{ color: '#22c55e' }}>💰{money}</span>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        </div>
        <div className="flex gap-1 mt-1 items-center">
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className="px-2 py-0.5 rounded text-xs font-bold transition-colors"
              style={speedMultiplier === s
                ? { background: '#eab308', color: '#1a1a2e' }
                : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
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
      </div>
    </div>
  );
});
