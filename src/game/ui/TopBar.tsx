import React from 'react';
import { CameraMode } from '../types';
import { Clock, Users, Crosshair, Zap, Smile, Building2, Moon, Sun, CloudRain, Radio, Heart } from 'lucide-react';

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
  airRaidTimer: number;
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

function StatMicro({ icon, value, color, label }: { icon: React.ReactNode; value: string | number; color?: string; label?: string }) {
  return (
    <div className="stat-micro" title={label}>
      <span style={{ color: color || 'hsl(var(--muted-foreground))' }}>{icon}</span>
      <span className="font-mono tabular-nums text-[11px] font-bold" style={{ color: color || 'hsl(var(--foreground))' }}>
        {typeof value === 'number' ? Math.round(value) : value}
      </span>
    </div>
  );
}

export const TopBar = React.memo(function TopBar({
  score, combo, money, lives, speedMultiplier,
  elapsedTime, passengersDelivered, dronesIntercepted, totalDrones,
  networkEfficiency, isNight, waveIndex, isAirRaid, airRaidTimer,
  powerGrid, maxPower, rushHourActive, radarActive,
  satisfactionRate, buildingsDestroyed, gameMode, winConditionMet,
  cameraMode, isRaining, passiveIncome, mission,
  onSpeedChange,
}: TopBarProps) {
  const powerPct = Math.round((powerGrid / maxPower) * 100);

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
      <div className="pointer-events-auto mx-2 mt-2 px-4 py-2 rounded-xl flex items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: 'hsl(225 45% 5% / 1)',
          border: '1px solid hsl(220 20% 14% / 1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
        {/* Bottom gradient border (metro colors) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{
          background: 'linear-gradient(90deg, #e53935, #1e88e5, #43a047)',
          opacity: 0.6,
        }} />

        {/* LEFT: Primary stats */}
        <div className="flex items-center gap-3 text-xs">
          {/* Score */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black tracking-tight tabular-nums" style={{
              color: 'hsl(var(--foreground))',
              textShadow: '0 0 12px rgba(255,255,255,0.1)',
            }}>
              {Math.round(score).toLocaleString()}
            </span>
            <span className="text-xs font-black px-1.5 py-0.5 rounded-md" style={{
              color: combo >= 3 ? 'hsl(var(--game-bg))' : 'hsl(var(--muted-foreground))',
              background: combo >= 3 ? 'hsl(var(--game-accent))' : 'hsl(220 25% 12% / 1)',
              border: combo >= 3 ? 'none' : '1px solid hsl(220 20% 16% / 1)',
              transition: 'all 0.2s ease',
            }}>
              x{combo.toFixed(1)}
            </span>
          </div>

          <div className="game-divider h-5 self-center" />

          {/* Money */}
          <div className="flex items-center gap-1">
            <span className="font-black text-sm tabular-nums" style={{
              color: 'hsl(145, 63%, 55%)',
              textShadow: '0 0 8px rgba(34,197,94,0.3)',
            }}>
              ${money}
            </span>
            <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{
              background: 'hsl(145 63% 20% / 0.3)',
              color: 'hsl(145, 63%, 65%)',
            }}>+{passiveIncome}/10с</span>
          </div>

          <div className="game-divider h-5 self-center" />

          {/* Lives as hearts */}
          <div className="flex gap-1 items-center" style={{
            animation: lives <= 2 ? 'heart-pulse 1s ease-in-out infinite' : undefined,
          }}>
            {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
              <Heart key={i} size={12} fill="hsl(0, 72%, 55%)" color="hsl(0, 72%, 55%)"
                style={{ filter: lives <= 2 ? 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' : 'none' }} />
            ))}
            {Array.from({ length: Math.max(0, 3 - lives) }).map((_, i) => (
              <Heart key={`d${i}`} size={12} fill="hsl(220 15% 18%)" color="hsl(220 15% 22%)" />
            ))}
          </div>
        </div>

        {/* CENTER: Speed + Wave */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{
            border: '1px solid hsl(220 20% 16% / 1)',
            background: 'hsl(225 40% 7% / 1)',
          }}>
            {[1, 2, 5, 10].map(s => (
              <button key={s} onClick={() => onSpeedChange(s)}
                className="px-2.5 py-1 text-[10px] font-black transition-all"
                style={speedMultiplier === s
                  ? {
                    background: 'hsl(var(--game-accent))',
                    color: 'hsl(var(--game-bg))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }
                  : {
                    background: 'transparent',
                    color: 'hsl(var(--muted-foreground))',
                  }
                }>
                {s}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-md transition-all" style={{
              background: isAirRaid ? 'hsl(0 72% 51% / 0.2)' : 'hsl(220 25% 12% / 1)',
              color: isAirRaid ? 'hsl(0, 72%, 70%)' : 'hsl(var(--muted-foreground))',
              border: isAirRaid ? '1px solid hsl(0 72% 51% / 0.4)' : '1px solid hsl(220 20% 16% / 1)',
            }}>
              ХВИЛЯ {waveIndex + 1}
            </span>
            {isAirRaid && airRaidTimer > 0 && (
              <span className="text-[10px] font-black px-2 py-1 rounded-md animate-pulse" style={{
                background: 'hsl(0 72% 51% / 0.15)',
                color: 'hsl(0, 72%, 65%)',
                border: '1px solid hsl(0 72% 51% / 0.3)',
              }}>
                {Math.ceil(airRaidTimer / 1000)}с
              </span>
            )}
            {rushHourActive && (
              <span className="text-[10px] font-black px-2 py-1 rounded-md animate-pulse" style={{
                background: 'hsl(var(--game-accent) / 0.15)',
                color: 'hsl(var(--game-accent))',
                border: '1px solid hsl(var(--game-accent) / 0.3)',
              }}>
                ПІК
              </span>
            )}
            {winConditionMet && (
              <span className="text-[10px] font-black px-2 py-1 rounded-md animate-pulse" style={{
                background: 'hsl(145 63% 49% / 0.15)',
                color: 'hsl(145, 63%, 60%)',
                border: '1px solid hsl(145 63% 49% / 0.3)',
              }}>
                ПЕРЕМОГА
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Secondary stats in micro-cards */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <StatMicro icon={<Clock size={11} />} value={formatTime(elapsedTime)} label="Час" />
          <StatMicro icon={<Users size={11} />} value={passengersDelivered} label="Пасажири" />
          <StatMicro icon={<Crosshair size={11} />} value={`${dronesIntercepted}/${totalDrones}`}
            color="hsl(var(--destructive))" label="Дрони" />

          <div className="game-divider h-5 self-center" />

          <StatMicro icon={<Zap size={11} />} value={`${powerPct}%`}
            color={powerPct < 20 ? 'hsl(var(--destructive))' : powerPct < 50 ? 'hsl(var(--game-accent))' : 'hsl(145, 63%, 55%)'} label="Енергія" />
          <StatMicro icon={<Smile size={11} />} value={`${satisfactionRate}%`}
            color={satisfactionRate > 80 ? 'hsl(145, 63%, 55%)' : satisfactionRate > 50 ? 'hsl(var(--game-accent))' : 'hsl(var(--destructive))'} label="Задоволеність" />

          {buildingsDestroyed > 0 && (
            <StatMicro icon={<Building2 size={11} />} value={buildingsDestroyed} color="hsl(var(--destructive))" label="Зруйновано" />
          )}

          <div className="flex items-center gap-1 px-1">
            {isNight
              ? <Moon size={11} style={{ color: 'hsl(220 10% 40%)' }} />
              : <Sun size={11} style={{ color: 'hsl(45 90% 55%)' }} />}
            {isRaining && <CloudRain size={11} style={{ color: 'hsl(204 70% 50%)' }} />}
            {radarActive && <Radio size={11} style={{ color: 'hsl(204, 70%, 53%)' }} />}
          </div>
        </div>
      </div>

      {/* Mission tracker */}
      {mission && (
        <div className="pointer-events-none mx-auto mt-1.5 px-4 py-1.5 rounded-lg text-center max-w-xs" style={{
          background: 'hsl(225 45% 6% / 1)',
          border: '1px solid hsl(220 20% 16% / 1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <p className="text-[10px] font-black" style={{ color: 'hsl(var(--game-accent))' }}>{mission.text}</p>
          <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'hsl(220 25% 10% / 1)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(100, (mission.progress / mission.target) * 100)}%`,
              background: 'linear-gradient(90deg, hsl(var(--game-accent)), hsl(45 85% 65%))',
              boxShadow: '0 0 8px rgba(234,179,8,0.4)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
});
