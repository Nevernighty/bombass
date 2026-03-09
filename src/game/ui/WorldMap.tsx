import React, { useState } from 'react';
import { Map, MapPin } from 'lucide-react';
import { CITIES, getCityConfig } from '../config/cities';
import { CityState, IntercityTrain } from '../types';

interface WorldMapProps {
  currentCity: string;
  cityStates: Record<string, CityState>;
  intercityTrains: IntercityTrain[];
  globalStability: number;
  onSwitchCity: (cityId: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

// Approximate geographic positions on a Ukraine silhouette (% based)
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  lviv: { x: 12, y: 35 },
  kyiv: { x: 42, y: 28 },
  kharkiv: { x: 72, y: 30 },
  dnipro: { x: 60, y: 52 },
  odesa: { x: 38, y: 72 },
};

// Simplified Ukraine outline SVG path
const UKRAINE_PATH = "M 5,30 Q 8,25 12,22 L 18,18 Q 25,12 35,10 L 45,8 Q 55,6 65,10 L 75,15 Q 82,18 88,22 L 92,28 Q 95,35 93,42 L 90,48 Q 85,55 78,60 L 70,65 Q 62,70 52,75 L 42,78 Q 32,80 22,76 L 15,70 Q 8,62 5,52 L 3,42 Q 2,36 5,30 Z";

function getStabilityColor(stability: number): string {
  if (stability >= 80) return 'hsl(145, 63%, 55%)';
  if (stability >= 50) return 'hsl(45, 90%, 55%)';
  return 'hsl(0, 72%, 55%)';
}

export const WorldMap = React.memo(function WorldMap({
  currentCity, cityStates, intercityTrains, globalStability,
  onSwitchCity, isVisible, onToggle,
}: WorldMapProps) {
  if (!isVisible) return null;

  const cityIds = Object.keys(CITIES);

  return (
    <div className="absolute bottom-20 left-3 pointer-events-auto z-30 animate-in slide-in-from-left-4 duration-300">
      <div className="rounded-xl overflow-hidden" style={{
        width: 320,
        background: 'hsl(225 45% 5% / 0.97)',
        border: '1px solid hsl(220 20% 14%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2" style={{
          borderBottom: '1px solid hsl(220 20% 14%)',
        }}>
          <div className="flex items-center gap-2">
            <Map size={14} style={{ color: 'hsl(var(--game-accent))' }} />
            <span className="text-[11px] font-black tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>
              УКРАЇНА
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{
              background: `${getStabilityColor(globalStability)}20`,
              color: getStabilityColor(globalStability),
              border: `1px solid ${getStabilityColor(globalStability)}40`,
            }}>
              Стабільність: {globalStability}%
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 180 }}>
          {/* Ukraine outline */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            <path d={UKRAINE_PATH} fill="hsl(220 25% 10%)" stroke="hsl(220 15% 25%)" strokeWidth="0.5" />
          </svg>

          {/* Intercity train routes */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            {intercityTrains.map(train => {
              const from = CITY_POSITIONS[train.fromCity];
              const to = CITY_POSITIONS[train.toCity];
              if (!from || !to) return null;
              const cx = from.x + (to.x - from.x) * train.progress;
              const cy = from.y + (to.y - from.y) * train.progress;
              return (
                <g key={train.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="hsl(270 60% 60%)" strokeWidth="0.3" strokeDasharray="2 1" opacity={0.4} />
                  <circle cx={cx} cy={cy} r={1.5} fill="hsl(270 60% 60%)" opacity={0.9}>
                    <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Connection lines between cities */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            {cityIds.map(cid => {
              const city = getCityConfig(cid);
              const from = CITY_POSITIONS[cid];
              if (!from) return null;
              return city.intercityConnections.map(conn => {
                const to = CITY_POSITIONS[conn.targetCity];
                if (!to) return null;
                // Only draw if alphabetically first to avoid duplicates
                if (cid > conn.targetCity) return null;
                return (
                  <line key={`${cid}-${conn.targetCity}`}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="hsl(220 15% 22%)" strokeWidth="0.3" strokeDasharray="1.5 1" />
                );
              });
            })}
          </svg>

          {/* City nodes */}
          {cityIds.map(cid => {
            const pos = CITY_POSITIONS[cid];
            if (!pos) return null;
            const city = getCityConfig(cid);
            const cs = cityStates[cid];
            const isActive = cid === currentCity;
            const stability = cs?.stability ?? 50;
            const stabilityColor = getStabilityColor(stability);
            const isUnderAttack = cs && cs.stability < 40;

            return (
              <button key={cid}
                onClick={() => onSwitchCity(cid)}
                className="absolute flex flex-col items-center transition-all group"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}>
                {/* Pulse ring for active/alert */}
                {(isActive || isUnderAttack) && (
                  <div className="absolute rounded-full animate-ping" style={{
                    width: 28, height: 28,
                    background: isActive ? 'hsl(var(--game-accent) / 0.2)' : 'hsl(0 72% 55% / 0.3)',
                  }} />
                )}

                {/* City dot */}
                <div className="relative rounded-full flex items-center justify-center transition-all" style={{
                  width: isActive ? 24 : 18,
                  height: isActive ? 24 : 18,
                  background: isActive
                    ? 'linear-gradient(135deg, hsl(var(--game-accent)), hsl(45 85% 45%))'
                    : `${stabilityColor}30`,
                  border: `2px solid ${isActive ? 'hsl(var(--game-accent))' : stabilityColor}`,
                  boxShadow: isActive
                    ? '0 0 16px rgba(234,179,8,0.4)'
                    : isUnderAttack ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
                }}>
                  <span className="text-[8px]">{city.icon}</span>
                </div>

                {/* City label */}
                <div className="mt-0.5 px-1.5 py-0.5 rounded text-center" style={{
                  background: 'hsl(225 45% 5% / 0.9)',
                }}>
                  <span className="text-[8px] font-black block leading-none" style={{
                    color: isActive ? 'hsl(var(--game-accent))' : 'hsl(var(--foreground))',
                  }}>
                    {city.nameUa}
                  </span>
                  {/* Mini stability bar */}
                  <div className="w-8 h-0.5 rounded-full mt-0.5 mx-auto overflow-hidden" style={{ background: 'hsl(220 25% 12%)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${stability}%`,
                      background: stabilityColor,
                    }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
