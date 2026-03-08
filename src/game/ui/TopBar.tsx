import React, { useRef, useEffect, useState } from 'react';
import { CameraMode } from '../types';

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
  cameraMode: CameraMode;
  isRaining: boolean;
  passiveIncome: number;
  mission?: { text: string; progress: number; target: number } | null;
  onSpeedChange: (mult: number) => void;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function AnimatedValue({ value, color }: { value: number; color?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setFlash(value > prevRef.current ? 'up' : 'down');
      prevRef.current = value;
      const start = display;
      const diff = value - start;
      const steps = Math.min(10, Math.abs(diff));
      if (steps === 0) { setDisplay(value); return; }
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setDisplay(Math.round(start + (diff * step) / steps));
        if (step >= steps) {
          clearInterval(interval);
          setDisplay(value);
          setTimeout(() => setFlash(null), 200);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [value]);

  return (
    <span className="inline-block transition-transform duration-100" style={{
      color: color || '#fff',
      transform: flash === 'up' ? 'scale(1.15)' : flash === 'down' ? 'scale(0.9)' : 'scale(1)',
      textShadow: flash === 'up' ? '0 0 6px rgba(34,197,94,0.5)' : flash === 'down' ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
    }}>
      {display}
    </span>
  );
}

export const TopBar = React.memo(function TopBar({
  score, combo, money, lives, speedMultiplier,
  elapsedTime, passengersDelivered, dronesIntercepted, totalDrones,
  networkEfficiency, isNight, waveIndex, isAirRaid,
  powerGrid, maxPower, rushHourActive, radarActive,
  satisfactionRate, buildingsDestroyed, gameMode, winConditionMet,
  cameraMode, isRaining, passiveIncome, mission,
  onSpeedChange,
}: TopBarProps) {
  const powerPct = Math.round((powerGrid / maxPower) * 100);
  const [prevLives, setPrevLives] = useState(lives);
  const [heartPulse, setHeartPulse] = useState(false);
  const [waveFlash, setWaveFlash] = useState(false);
  const prevWaveRef = useRef(waveIndex);

  useEffect(() => {
    if (lives < prevLives) {
      setHeartPulse(true);
      setTimeout(() => setHeartPulse(false), 400);
    }
    setPrevLives(lives);
  }, [lives]);

  useEffect(() => {
    if (waveIndex !== prevWaveRef.current) {
      setWaveFlash(true);
      prevWaveRef.current = waveIndex;
      setTimeout(() => setWaveFlash(false), 600);
    }
  }, [waveIndex]);

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none">
      <div className="pointer-events-auto mx-2 mt-2 px-3 py-2 rounded-xl flex items-center justify-between gap-2 flex-wrap" style={{
        background: 'linear-gradient(180deg, rgba(8,12,28,0.95) 0%, rgba(8,12,28,0.88) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        {/* LEFT: Primary stats */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-base" style={{ color: '#fff' }}>
            <AnimatedValue value={Math.round(score)} />
          </span>
          <span className="transition-transform duration-150" style={{
            color: combo >= 3 ? '#f59e0b' : '#eab308',
            transform: combo >= 3 ? 'scale(1.1)' : 'scale(1)',
          }}>
            x{(Math.round(combo * 10) / 10).toFixed(1)}
          </span>
          <span style={{ color: '#22c55e' }}>
            💰<AnimatedValue value={money} color="#22c55e" />
          </span>
          <span className="text-[10px]" style={{ color: '#4ade80' }}>+{passiveIncome}/10с</span>
          <span style={{ display: 'inline-flex', gap: '1px' }}>
            {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
              <span key={i} style={heartPulse && i === Math.min(lives, 5) - 1 ? { animation: 'heart-pulse 0.4s ease-in-out' } : {}}>
                ❤️
              </span>
            ))}
            {Array.from({ length: Math.max(0, 3 - lives) }).map((_, i) => (
              <span key={`d${i}`}>🖤</span>
            ))}
          </span>
        </div>

        {/* CENTER: Wave + Speed + Status */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 5, 10].map(s => (
            <button key={s} onClick={() => onSpeedChange(s)}
              className="game-btn-hover px-2 py-0.5 rounded text-[10px] font-bold"
              style={speedMultiplier === s
                ? { background: '#eab308', color: '#1a1a2e', boxShadow: '0 0 8px rgba(234,179,8,0.4)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              {s}x
            </button>
          ))}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded transition-all" style={{
            background: isAirRaid ? 'rgba(220,38,38,0.4)' : waveFlash ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.04)',
            color: isAirRaid ? '#fca5a5' : '#9ca3af',
            border: isAirRaid ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.06)',
            transform: waveFlash ? 'scale(1.1)' : 'scale(1)',
          }}>
            Хвиля {waveIndex + 1}
          </span>
          {rushHourActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'rgba(234,179,8,0.3)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.5)',
            }}>
              🚇 ПІК
            </span>
          )}
          {gameMode !== 'classic' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
              {gameMode === 'rush_hour' ? '🚇' : gameMode === 'siege' ? '💣' : gameMode === 'blackout' ? '🌑' : '🌉'}
            </span>
          )}
          {winConditionMet && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'rgba(34,197,94,0.3)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.5)',
            }}>
              🎉 ПЕРЕМОГА
            </span>
          )}
        </div>

        {/* RIGHT: Secondary stats */}
        <div className="flex items-center gap-2.5 text-[10px]" style={{ color: '#9ca3af' }}>
          <span>⏱ {formatTime(elapsedTime)}</span>
          <span>🚇 <AnimatedValue value={passengersDelivered} color="#9ca3af" /></span>
          <span>🎯 {dronesIntercepted}/{totalDrones}</span>
          <span>📊 {networkEfficiency}%</span>
          <span style={{ color: powerPct < 20 ? '#ef4444' : powerPct < 50 ? '#f59e0b' : '#22c55e' }}>
            ⚡{powerPct}%
          </span>
          <span style={{ color: satisfactionRate > 80 ? '#22c55e' : satisfactionRate > 50 ? '#f59e0b' : '#ef4444' }}>
            😊{satisfactionRate}%
          </span>
          {buildingsDestroyed > 0 && <span style={{ color: '#ef4444' }}>🏚️{buildingsDestroyed}</span>}
          <span>{isNight ? '🌙' : '☀️'}</span>
          {isRaining && <span>🌧️</span>}
          {radarActive && <span style={{ color: '#06b6d4' }}>📡</span>}
        </div>
      </div>

      {/* Mission tracker */}
      {mission && (
        <div className="pointer-events-none mx-auto mt-1 px-3 py-1 rounded-lg text-center max-w-xs" style={{
          background: 'rgba(8,12,28,0.85)',
          border: '1px solid rgba(234,179,8,0.2)',
        }}>
          <p className="text-[10px] font-bold" style={{ color: '#eab308' }}>{mission.text}</p>
          <div className="h-1 rounded-full mt-0.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(100, (mission.progress / mission.target) * 100)}%`,
              background: 'linear-gradient(90deg, #eab308, #f59e0b)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
});
