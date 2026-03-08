import React, { useState } from 'react';
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

function PanelBtn({ onClick, disabled, color, borderColor, children, cost, insufficientMoney }: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  borderColor: string;
  children: React.ReactNode;
  cost?: number;
  insufficientMoney?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`game-btn-hover px-2 py-1.5 rounded-md text-xs font-medium disabled:opacity-30 ${disabled ? 'game-btn-disabled' : ''}`}
      style={{
        color: insufficientMoney ? '#ef4444' : color,
        border: `1px solid ${borderColor}`,
        background: 'rgba(255,255,255,0.02)',
      }}>
      {children}
      {cost !== undefined && <span className="ml-0.5 opacity-70">({cost})</span>}
    </button>
  );
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
    <div className="absolute bottom-20 left-3 px-3 py-2.5 rounded-xl text-xs pointer-events-auto max-w-xs animate-slide-in-left"
      style={{ background: 'rgba(8,12,28,0.94)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-white font-bold text-sm">{station.nameUa}</p>
        <button onClick={onClose} className="w-5 h-5 rounded flex items-center justify-center transition-all hover:rotate-90 hover:bg-white/10" style={{ color: '#6b7280' }}>✕</button>
      </div>
      <p className="mb-1.5" style={{ color: '#9ca3af' }}>
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
      <div className="w-full h-2.5 rounded-full mb-1.5 overflow-hidden" style={{ background: '#1a1a2e' }}>
        <div className="h-full rounded-full" style={{
          width: `${hpPct}%`,
          background: `linear-gradient(90deg, ${hpColor}, ${hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#fbbf24' : '#f87171'})`,
          transition: 'width 0.5s ease, background 0.3s ease',
          boxShadow: `0 0 8px ${hpColor}40`,
        }} />
      </div>
      <p className="text-xs mb-1.5" style={{ color: hpColor }}>{station.hp}/{station.maxHp} HP • 🚶 {station.passengers.length}/{station.maxPassengers} • 💰 {station.stationIncome}</p>

      {/* Passenger shapes with breathing animation */}
      {station.passengers.length > 0 && (
        <div className="flex gap-0.5 mb-2 flex-wrap">
          {station.passengers.slice(0, 12).map((p, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-sm text-center leading-[14px] inline-block"
              style={{
                fontSize: '9px',
                background: p.shape === 'circle' ? '#ff6b6b' : p.shape === 'square' ? '#4ecdc4' : p.shape === 'triangle' ? '#ffe66d' : p.shape === 'diamond' ? '#a29bfe' : '#fd79a8',
                animation: p.patience < 3000 ? `heart-pulse 0.5s ease-in-out ${i * 0.05}s infinite` : undefined,
              }}>
              {p.shape === 'circle' ? '●' : p.shape === 'square' ? '■' : p.shape === 'triangle' ? '▲' : p.shape === 'diamond' ? '◆' : '★'}
            </span>
          ))}
          {station.passengers.length > 12 && <span style={{ color: '#6b7280' }}>+{station.passengers.length - 12}</span>}
        </div>
      )}

      {/* Defense */}
      <p className="text-[10px] mb-1 mt-1 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>🛡️ Оборона</p>
      <div className="flex gap-1 flex-wrap mb-2">
        <PanelBtn onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          insufficientMoney={money < GAME_CONFIG.ANTI_AIR_COST}
          color="#3b82f6" borderColor="rgba(59,130,246,0.3)" cost={GAME_CONFIG.ANTI_AIR_COST}>
          🛡️ ПРО
        </PanelBtn>
        <PanelBtn onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM}
          insufficientMoney={money < GAME_CONFIG.SAM_BATTERY_COST}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.SAM_BATTERY_COST}>
          🚀 ЗРК
        </PanelBtn>
        <PanelBtn onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret}
          insufficientMoney={money < GAME_CONFIG.AA_TURRET_COST}
          color="#f59e0b" borderColor="rgba(245,158,11,0.3)" cost={GAME_CONFIG.AA_TURRET_COST}>
          🔫 Турель
        </PanelBtn>
        <PanelBtn onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST}
          insufficientMoney={money < GAME_CONFIG.INTERCEPTOR_COST}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.INTERCEPTOR_COST}>
          🛩️ Перехоп
        </PanelBtn>
        <PanelBtn onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          insufficientMoney={money < GAME_CONFIG.SHIELD_COST}
          color="#06b6d4" borderColor="rgba(6,182,212,0.3)" cost={GAME_CONFIG.SHIELD_COST}>
          ⚡ Щит
        </PanelBtn>
        <PanelBtn onClick={onFortify} disabled={money < 100 || station.isFortified}
          insufficientMoney={money < 100}
          color="#9ca3af" borderColor="rgba(255,255,255,0.2)" cost={100}>
          🏰 Форт
        </PanelBtn>
        <PanelBtn onClick={onEMP} disabled={money < 60 || station.empCooldown > 0}
          insufficientMoney={money < 60}
          color="#a855f7" borderColor="rgba(168,85,247,0.3)" cost={60}>
          ⚡ ЕМІ
        </PanelBtn>
      </div>

      {/* Station actions */}
      <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>🚇 Станція</p>
      <div className="flex gap-1 flex-wrap">
        <PanelBtn onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * station.level}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.UPGRADE_COST * station.level}>
          ⬆️
        </PanelBtn>
        <PanelBtn onClick={onEvacuate} disabled={station.passengers.length === 0}
          color="#f97316" borderColor="rgba(249,115,22,0.3)">
          🚨 Евак
        </PanelBtn>
        <PanelBtn onClick={onToggle}
          color="#9ca3af" borderColor="rgba(255,255,255,0.15)">
          {station.isOpen ? '🔒' : '🔓'}
        </PanelBtn>
        {station.depth === 'deep' && isAirRaid && (
          <PanelBtn onClick={onShelter}
            color="#f59e0b" borderColor="rgba(245,158,11,0.3)">
            {station.isSheltering ? '🏠↑' : '🏠↓'}
          </PanelBtn>
        )}
        <PanelBtn onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0}
          insufficientMoney={money < GAME_CONFIG.TUNNEL_SEAL_COST}
          color="#9ca3af" borderColor="rgba(255,255,255,0.15)" cost={GAME_CONFIG.TUNNEL_SEAL_COST}>
          🚧
        </PanelBtn>
        <PanelBtn onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0}
          insufficientMoney={money < GAME_CONFIG.SPEED_BOOST_COST}
          color="#a855f7" borderColor="rgba(168,85,247,0.3)" cost={GAME_CONFIG.SPEED_BOOST_COST}>
          🚀
        </PanelBtn>
        <PanelBtn onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST}
          insufficientMoney={money < GAME_CONFIG.EXPRESS_LINE_COST}
          color="#3b82f6" borderColor="rgba(59,130,246,0.3)" cost={GAME_CONFIG.EXPRESS_LINE_COST}>
          🚄
        </PanelBtn>
        <PanelBtn onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0}
          insufficientMoney={money < GAME_CONFIG.STATION_MAGNET_COST}
          color="#ec4899" borderColor="rgba(236,72,153,0.3)" cost={GAME_CONFIG.STATION_MAGNET_COST}>
          🧲
        </PanelBtn>
      </div>
    </div>
  );
});
