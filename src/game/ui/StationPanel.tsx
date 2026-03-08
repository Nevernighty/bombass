import React from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG } from '../constants';

interface StationPanelProps {
  station: GameStation;
  money: number;
  onClose: () => void;
  onDeployAA: () => void;
  onShield: () => void;
  onUpgrade: () => void;
  onEvacuate: () => void;
  onToggle: () => void;
}

export const StationPanel = React.memo(function StationPanel({
  station, money, onClose, onDeployAA, onShield, onUpgrade, onEvacuate, onToggle,
}: StationPanelProps) {
  return (
    <div className="absolute bottom-20 left-3 px-3 py-2 rounded-lg text-xs pointer-events-auto max-w-xs" style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex justify-between items-center mb-1">
        <p className="text-white font-bold text-sm">{station.nameUa}</p>
        <button onClick={onClose} className="text-xs hover:text-white" style={{ color: '#6b7280' }}>✕</button>
      </div>
      <p className="mb-2" style={{ color: '#9ca3af' }}>
        {station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3'} •
        {station.depth === 'deep' ? ' Глибока' : ' Мілка'} •
        Рівень {station.level} •
        HP {station.hp}/{station.maxHp}
        {station.isOnFire ? ' 🔥' : ''}
        {station.isDestroyed ? ' 💀' : ''}
        {station.hasAntiAir ? ' 🛡️' : ''}
      </p>
      <div className="w-full h-1.5 rounded-full mb-2" style={{ background: '#374151' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(station.hp / station.maxHp) * 100}%`, background: station.hp > 50 ? '#22c55e' : '#ef4444' }} />
      </div>
      <div className="flex gap-1 flex-wrap">
        <button onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
          style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
          🛡️ ПРО ({GAME_CONFIG.ANTI_AIR_COST}💰)
        </button>
        <button onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
          style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
          ⚡ Щит ({GAME_CONFIG.SHIELD_COST}💰)
        </button>
        <button onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
          style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          ⬆️ Рівень ({GAME_CONFIG.UPGRADE_COST * station.level}💰)
        </button>
        <button onClick={onEvacuate} disabled={station.passengers.length === 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
          style={{ color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
          🚨 Евак
        </button>
        <button onClick={onToggle}
          className="px-2 py-1 rounded text-xs transition-colors"
          style={{ color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
          {station.isOpen ? '🔒 Закр' : '🔓 Відкр'}
        </button>
      </div>
    </div>
  );
});
