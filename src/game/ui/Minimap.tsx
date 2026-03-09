import React from 'react';
import { GameState } from '../types';
import { STATIONS, METRO_LINES } from '../constants';
import { useLanguage } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';

interface MinimapProps {
  stateRef: React.MutableRefObject<GameState>;
  state: GameState;
}

export const Minimap = React.memo(function Minimap({ stateRef, state }: MinimapProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Hide on mobile — WorldMap serves the purpose
  if (isMobile) return null;

  const W = 200;
  const H = 160;

  return (
    <div className="absolute bottom-20 right-2 pointer-events-none z-10">
      <div className="rounded-xl overflow-hidden" style={{
        width: W,
        background: 'hsl(225 45% 4% / 1)',
        border: '1px solid hsl(220 20% 14% / 1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        <div className="h-[2px]" style={{
          background: 'linear-gradient(90deg, #e53935, #1e88e5, #43a047)',
        }} />

        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[8px] font-black tracking-widest uppercase" style={{
            color: 'hsl(var(--game-accent))',
            opacity: 0.7,
          }}>{t('minimap.title')}</span>
          <span className="text-[8px] font-mono" style={{ color: 'hsl(220 10% 40%)' }}>
            {state.trains.length}T · {state.drones.filter(d => !d.isDestroyed).length}D
          </span>
        </div>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="hsl(225 45% 4%)" />
          {(['red', 'blue', 'green'] as const).map(line => {
            const lineStations = STATIONS.filter(s => s.line === line && state.activeStationIds.includes(s.id));
            if (lineStations.length < 2) return null;
            const points = lineStations.map(s => `${s.x * W},${s.y * H}`).join(' ');
            return <polyline key={line} points={points} fill="none" stroke={METRO_LINES[line].color} strokeWidth="2" opacity="0.5" />;
          })}
          {state.activeStationIds.map(id => {
            const st = STATIONS.find(s => s.id === id);
            if (!st) return null;
            const gameSt = state.stations.find(s => s.id === id);
            const isDestroyed = gameSt?.isDestroyed;
            return (
              <g key={id}>
                <circle cx={st.x * W} cy={st.y * H} r={st.isTransfer ? 4 : 2.5}
                  fill={isDestroyed ? 'hsl(220 15% 25%)' : METRO_LINES[st.line].color}
                  opacity={isDestroyed ? 0.3 : 0.9} />
                {st.isTransfer && (
                  <circle cx={st.x * W} cy={st.y * H} r={4}
                    fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                )}
              </g>
            );
          })}
          {state.trains.map(tr => (
            <g key={tr.id}>
              <circle cx={tr.x * W} cy={tr.y * H} r={3}
                fill="#fff" stroke={METRO_LINES[tr.line].color} strokeWidth="1.5" opacity="0.95" />
            </g>
          ))}
          {state.drones.filter(d => !d.isDestroyed).map(d => (
            <g key={d.id}>
              <circle cx={d.x * W} cy={d.y * H} r={5} fill="rgba(255,50,50,0.15)" />
              <circle cx={d.x * W} cy={d.y * H} r={2} fill="#ff3333" opacity="0.9" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
});
