import React from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG } from '../constants';

interface StationPanelProps {
  station: GameStation;
  money: number;
  isAirRaid: boolean;
  speedBoostCooldown: number;
  stationMagnetTimer: number;
  onClose: () => void;
  onDeployAA: () => void;
  onShield: () => void;
  onUpgrade: () => void;
  onEvacuate: () => void;
  onToggle: () => void;
  onShelter: () => void;
  onSealTunnel: () => void;
  onSpeedBoost: () => void;
  onExpressLine: () => void;
  onStationMagnet: () => void;
  onBuySAM: () => void;
  onBuyAATurret: () => void;
  onLaunchInterceptor: () => void;
  onFortify: () => void;
  onEMP: () => void;
}

export const StationPanel = React.memo(function StationPanel({
  station, money, isAirRaid, speedBoostCooldown, stationMagnetTimer,
  onClose, onDeployAA, onShield, onUpgrade, onEvacuate, onToggle,
  onShelter, onSealTunnel, onSpeedBoost, onExpressLine, onStationMagnet,
  onBuySAM, onBuyAATurret, onLaunchInterceptor, onFortify, onEMP,
}: StationPanelProps) {
  const hpPct = (station.hp / station.maxHp) * 100;
  const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="absolute bottom-20 left-3 px-3 py-2 rounded-lg text-xs pointer-events-auto max-w-xs" style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex justify-between items-center mb-1">
        <p className="text-white font-bold text-sm">{station.nameUa}</p>
        <button onClick={onClose} className="text-xs hover:text-white" style={{ color: '#6b7280' }}>✕</button>
      </div>
      <p className="mb-1" style={{ color: '#9ca3af' }}>
        {station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3'} •
        {station.depth === 'deep' ? ' Глибока' : ' Мілка'} •
        Рівень {station.level}
        {station.isFortified ? ' 🏰' : ''}
        {station.isOnFire ? ' 🔥' : ''}
        {station.isDestroyed ? ' 💀' : ''}
        {station.hasAntiAir ? ' 🛡️' : ''}
        {station.hasSAM ? ' 🚀' : ''}
        {station.hasAATurret ? ' 🔫' : ''}
        {station.isSheltering ? ' 🏠' : ''}
        {station.tunnelSealTimer > 0 ? ' 🚧' : ''}
      </p>
      {/* HP bar */}
      <div className="w-full h-2 rounded-full mb-1 overflow-hidden" style={{ background: '#374151' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{
          width: `${hpPct}%`,
          background: `linear-gradient(90deg, ${hpColor}, ${hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#fbbf24' : '#f87171'})`,
        }} />
      </div>
      <p className="text-xs mb-1" style={{ color: hpColor }}>{station.hp}/{station.maxHp} HP • 🚶 {station.passengers.length}/{station.maxPassengers} • 💰 {station.stationIncome}</p>

      {/* Passenger shapes */}
      {station.passengers.length > 0 && (
        <div className="flex gap-0.5 mb-1.5 flex-wrap">
          {station.passengers.slice(0, 12).map((p, i) => (
            <span key={i} className="w-3 h-3 rounded-sm text-center leading-3" style={{
              fontSize: '8px',
              background: p.shape === 'circle' ? '#ff6b6b' : p.shape === 'square' ? '#4ecdc4' : p.shape === 'triangle' ? '#ffe66d' : p.shape === 'diamond' ? '#a29bfe' : '#fd79a8',
            }}>
              {p.shape === 'circle' ? '●' : p.shape === 'square' ? '■' : p.shape === 'triangle' ? '▲' : p.shape === 'diamond' ? '◆' : '★'}
            </span>
          ))}
          {station.passengers.length > 12 && <span style={{ color: '#6b7280' }}>+{station.passengers.length - 12}</span>}
        </div>
      )}

      {/* Defense */}
      <p className="text-xs mb-0.5 mt-1" style={{ color: '#6b7280' }}>🛡️ Оборона</p>
      <div className="flex gap-1 flex-wrap mb-1.5">
        <button onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
          🛡️ ПРО ({GAME_CONFIG.ANTI_AIR_COST})
        </button>
        <button onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          🚀 ЗРК ({GAME_CONFIG.SAM_BATTERY_COST})
        </button>
        <button onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
          🔫 Турель ({GAME_CONFIG.AA_TURRET_COST})
        </button>
        <button onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          🛩️ Перехоп ({GAME_CONFIG.INTERCEPTOR_COST})
        </button>
        <button onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
          ⚡ Щит ({GAME_CONFIG.SHIELD_COST})
        </button>
        <button onClick={onFortify} disabled={money < 100 || station.isFortified}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#9ca3af', border: '1px solid rgba(255,255,255,0.2)' }}>
          🏰 Форт (100)
        </button>
        <button onClick={onEMP} disabled={money < 60 || station.empCooldown > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
          ⚡ ЕМІ (60)
        </button>
      </div>

      {/* Station actions */}
      <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>🚇 Станція</p>
      <div className="flex gap-1 flex-wrap">
        <button onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          ⬆️ ({GAME_CONFIG.UPGRADE_COST * station.level})
        </button>
        <button onClick={onEvacuate} disabled={station.passengers.length === 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
          🚨 Евак
        </button>
        <button onClick={onToggle}
          className="px-2 py-1 rounded text-xs" style={{ color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
          {station.isOpen ? '🔒' : '🔓'}
        </button>
        {station.depth === 'deep' && isAirRaid && (
          <button onClick={onShelter}
            className="px-2 py-1 rounded text-xs" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            {station.isSheltering ? '🏠↑' : '🏠↓'}
          </button>
        )}
        <button onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
          🚧 ({GAME_CONFIG.TUNNEL_SEAL_COST})
        </button>
        <button onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
          🚀 ({GAME_CONFIG.SPEED_BOOST_COST})
        </button>
        <button onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
          🚄 ({GAME_CONFIG.EXPRESS_LINE_COST})
        </button>
        <button onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0}
          className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)' }}>
          🧲 ({GAME_CONFIG.STATION_MAGNET_COST})
        </button>
      </div>
    </div>
  );
});
