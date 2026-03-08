import React from 'react';
import { GameState } from '../types';
import { STATIONS, METRO_LINES } from '../constants';

interface MinimapProps {
  stateRef: React.MutableRefObject<GameState>;
  state: GameState;
}

export const Minimap = React.memo(function Minimap({ stateRef, state }: MinimapProps) {
  const W = 180;
  const H = 140;

  return (
    <div className="absolute bottom-20 right-2 pointer-events-none z-10">
      <div className="game-panel-solid rounded-lg overflow-hidden" style={{ width: W, height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Background */}
          <rect width={W} height={H} fill="rgba(6,10,20,0.9)" />

          {/* Metro lines */}
          {(['red', 'blue', 'green'] as const).map(line => {
            const lineStations = STATIONS.filter(s => s.line === line && state.activeStationIds.includes(s.id));
            if (lineStations.length < 2) return null;
            const points = lineStations.map(s => `${s.x * W},${s.y * H}`).join(' ');
            return (
              <polyline key={line} points={points} fill="none" stroke={METRO_LINES[line].color} strokeWidth="1.5" opacity="0.6" />
            );
          })}

          {/* Station dots */}
          {state.activeStationIds.map(id => {
            const st = STATIONS.find(s => s.id === id);
            if (!st) return null;
            const gameSt = state.stations.find(s => s.id === id);
            const isDestroyed = gameSt?.isDestroyed;
            return (
              <circle
                key={id}
                cx={st.x * W}
                cy={st.y * H}
                r={st.isTransfer ? 3 : 2}
                fill={isDestroyed ? '#555' : METRO_LINES[st.line].color}
                opacity={isDestroyed ? 0.4 : 0.9}
              />
            );
          })}

          {/* Train dots */}
          {state.trains.map(t => (
            <circle
              key={t.id}
              cx={t.x * W}
              cy={t.y * H}
              r={2.5}
              fill="#ffffff"
              stroke={METRO_LINES[t.line].color}
              strokeWidth="1"
              opacity="0.95"
            />
          ))}

          {/* Drone dots */}
          {state.drones.filter(d => !d.isDestroyed).map(d => (
            <circle
              key={d.id}
              cx={d.x * W}
              cy={d.y * H}
              r={2}
              fill="#ff3333"
              opacity="0.85"
            />
          ))}

          {/* Border */}
          <rect width={W} height={H} fill="none" stroke="hsla(var(--border), 0.3)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
});
