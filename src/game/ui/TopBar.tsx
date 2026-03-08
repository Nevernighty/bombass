import React, { useRef, useEffect, useState } from 'react';
import { CameraMode } from '../types';
import { Clock, Users, Crosshair, Zap, Smile, Building2, Moon, Sun, CloudRain, Radio } from 'lucide-react';

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

function StatValue({ value, color, prefix }: { value: number | string; color?: string; prefix?: string }) {
  return (
    <span className="font-mono tabular-nums" style={{ color: color || 'hsl(var(--foreground))' }}>
      {prefix}{typeof value === 'number' ? Math.round(value) : value}
    </span>
  );
}

function StatItem({ icon, value, color, label }: { icon: React.ReactNode; value: number | string; color?: string; label?: string }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="opacity-60">{icon}</span>
      <StatValue value={value} color={color} />
    </div>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border/30" />;
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

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
      <div className="pointer-events-auto mx-2 mt-2 px-4 py-2 rounded-lg flex items-center justify-between gap-4 game-panel">
        {/* LEFT: Primary stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-base font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            {Math.round(score)}
          </span>
          <span className="text-xs font-bold" style={{
            color: combo >= 3 ? 'hsl(var(--game-accent))' : 'hsl(var(--muted-foreground))',
          }}>
            x{combo.toFixed(1)}
          </span>
          <Divider />
          <span className="font-bold" style={{ color: 'hsl(145, 63%, 49%)' }}>
            ${money}
          </span>
          <span className="text-[10px]" style={{ color: 'hsl(145, 63%, 60%)' }}>+{passiveIncome}/10с</span>
          <Divider />
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'hsl(0, 72%, 51%)' }} />
            ))}
            {Array.from({ length: Math.max(0, 3 - lives) }).map((_, i) => (
              <div key={`d${i}`} className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        </div>

        {/* CENTER: Speed + Wave */}
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {[1, 2, 5, 10].map(s => (
              <button key={s} onClick={() => onSpeedChange(s)}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                style={speedMultiplier === s
                  ? { background: 'hsl(var(--game-accent))', color: 'hsl(var(--game-bg))' }
                  : { background: 'transparent', color: 'hsl(var(--muted-foreground))' }
                }>
                {s}x
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded transition-all" style={{
            background: isAirRaid ? 'hsla(0, 72%, 51%, 0.2)' : 'hsla(var(--muted), 0.5)',
            color: isAirRaid ? 'hsl(0, 72%, 70%)' : 'hsl(var(--muted-foreground))',
            border: isAirRaid ? '1px solid hsla(0, 72%, 51%, 0.4)' : '1px solid transparent',
          }}>
            W{waveIndex + 1}
          </span>
          {rushHourActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'hsla(45, 90%, 55%, 0.15)', color: 'hsl(var(--game-accent))',
            }}>
              ПІК
            </span>
          )}
          {winConditionMet && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded animate-pulse" style={{
              background: 'hsla(145, 63%, 49%, 0.15)', color: 'hsl(145, 63%, 60%)',
            }}>
              ПЕРЕМОГА
            </span>
          )}
        </div>

        {/* RIGHT: Secondary stats */}
        <div className="flex items-center gap-2.5 text-[10px]">
          <StatItem icon={<Clock size={11} />} value={formatTime(elapsedTime)} label="Час" />
          <StatItem icon={<Users size={11} />} value={passengersDelivered} label="Пасажири" />
          <StatItem icon={<Crosshair size={11} />} value={`${dronesIntercepted}/${totalDrones}`} label="Дрони" />
          <Divider />
          <StatItem icon={<Zap size={11} />} value={`${powerPct}%`}
            color={powerPct < 20 ? 'hsl(var(--destructive))' : powerPct < 50 ? 'hsl(var(--game-accent))' : 'hsl(145, 63%, 49%)'} label="Енергія" />
          <StatItem icon={<Smile size={11} />} value={`${satisfactionRate}%`}
            color={satisfactionRate > 80 ? 'hsl(145, 63%, 49%)' : satisfactionRate > 50 ? 'hsl(var(--game-accent))' : 'hsl(var(--destructive))'} label="Задоволеність" />
          {buildingsDestroyed > 0 && (
            <StatItem icon={<Building2 size={11} />} value={buildingsDestroyed} color="hsl(var(--destructive))" label="Зруйновано" />
          )}
          {isNight ? <Moon size={11} className="opacity-40" /> : <Sun size={11} className="opacity-40" />}
          {isRaining && <CloudRain size={11} className="opacity-40" />}
          {radarActive && <Radio size={11} style={{ color: 'hsl(204, 70%, 53%)' }} />}
        </div>
      </div>

      {/* Mission tracker */}
      {mission && (
        <div className="pointer-events-none mx-auto mt-1 px-3 py-1 rounded-md text-center max-w-xs game-panel">
          <p className="text-[10px] font-bold" style={{ color: 'hsl(var(--game-accent))' }}>{mission.text}</p>
          <div className="h-1 rounded-full mt-0.5 overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(100, (mission.progress / mission.target) * 100)}%`,
              background: 'hsl(var(--game-accent))',
            }} />
          </div>
        </div>
      )}
    </div>
  );
});
