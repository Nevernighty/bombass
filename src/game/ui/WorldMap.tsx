import React from 'react';
import { Map } from 'lucide-react';
import { CITIES, getCityConfig } from '../config/cities';
import { CityState, IntercityTrain } from '../types';
import { useLanguage } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorldMapProps {
  currentCity: string;
  cityStates: Record<string, CityState>;
  intercityTrains: IntercityTrain[];
  globalStability: number;
  onSwitchCity: (cityId: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  lviv: { x: 12, y: 35 },
  kyiv: { x: 42, y: 28 },
  kharkiv: { x: 72, y: 30 },
  dnipro: { x: 60, y: 52 },
  odesa: { x: 38, y: 72 },
};

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
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  if (!isVisible) return null;

  const cityIds = Object.keys(CITIES);

  // Mobile: fullscreen overlay. Desktop: floating panel.
  const wrapClass = isMobile
    ? 'fixed inset-0 pointer-events-auto z-40 flex items-center justify-center animate-in fade-in-0 duration-200'
    : 'absolute bottom-20 left-3 pointer-events-auto z-30 animate-in slide-in-from-left-4 duration-300';

  return (
    <div className={wrapClass} style={isMobile ? { background: 'rgba(6,10,20,0.9)' } : undefined}>
      <div className={`rounded-xl overflow-hidden ${isMobile ? 'w-[90vw] max-w-md' : ''}`} style={{
        width: isMobile ? undefined : 320,
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
              {t('worldmap.title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{
              background: `${getStabilityColor(globalStability)}20`,
              color: getStabilityColor(globalStability),
              border: `1px solid ${getStabilityColor(globalStability)}40`,
            }}>
              {t('topbar.stability')}: {globalStability}%
            </span>
            {isMobile && (
              <button onClick={onToggle} className="text-[10px] font-black px-2 py-1 rounded-md cursor-pointer"
                style={{ background: 'hsl(220 25% 12%)', color: 'hsl(var(--foreground))', border: '1px solid hsl(220 20% 16%)' }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: isMobile ? 220 : 180 }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            <path d={UKRAINE_PATH} fill="hsl(220 25% 10%)" stroke="hsl(220 15% 25%)" strokeWidth="0.5" />
          </svg>

          {/* Intercity routes */}
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

          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet">
            {cityIds.map(cid => {
              const city = getCityConfig(cid);
              const from = CITY_POSITIONS[cid];
              if (!from) return null;
              return city.intercityConnections.map(conn => {
                const to = CITY_POSITIONS[conn.targetCity];
                if (!to) return null;
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
            const nodeSize = isMobile ? (isActive ? 28 : 22) : (isActive ? 24 : 18);

            return (
              <button key={cid}
                onClick={() => { onSwitchCity(cid); if (isMobile) onToggle(); }}
                className="absolute flex flex-col items-center transition-all group"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}>
                {(isActive || isUnderAttack) && (
                  <div className="absolute rounded-full animate-ping" style={{
                    width: nodeSize + 4, height: nodeSize + 4,
                    background: isActive ? 'hsl(var(--game-accent) / 0.2)' : 'hsl(0 72% 55% / 0.3)',
                  }} />
                )}

                <div className="relative rounded-full flex items-center justify-center transition-all" style={{
                  width: nodeSize,
                  height: nodeSize,
                  background: isActive
                    ? 'linear-gradient(135deg, hsl(var(--game-accent)), hsl(45 85% 45%))'
                    : `${stabilityColor}30`,
                  border: `2px solid ${isActive ? 'hsl(var(--game-accent))' : stabilityColor}`,
                  boxShadow: isActive
                    ? '0 0 16px rgba(234,179,8,0.4)'
                    : isUnderAttack ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
                }}>
                  <span className={`${isMobile ? 'text-[10px]' : 'text-[8px]'}`}>{city.icon}</span>
                </div>

                <div className="mt-0.5 px-1.5 py-0.5 rounded text-center" style={{
                  background: 'hsl(225 45% 5% / 0.9)',
                }}>
                  <span className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} font-black block leading-none`} style={{
                    color: isActive ? 'hsl(var(--game-accent))' : 'hsl(var(--foreground))',
                  }}>
                    {city.nameUa}
                  </span>
                  <div className={`${isMobile ? 'w-10' : 'w-8'} h-0.5 rounded-full mt-0.5 mx-auto overflow-hidden`} style={{ background: 'hsl(220 25% 12%)' }}>
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
