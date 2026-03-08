import React from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG, METRO_LINES } from '../constants';

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

function PanelBtn({ onClick, disabled, color, borderColor, children, cost, insufficientMoney, label }: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  borderColor: string;
  children: React.ReactNode;
  cost?: number;
  insufficientMoney?: boolean;
  label?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`game-btn-hover px-2.5 py-2 rounded-lg text-xs font-medium disabled:opacity-30 flex flex-col items-center gap-0.5 min-w-[44px] ${disabled ? 'game-btn-disabled' : ''}`}
      style={{
        color: insufficientMoney ? '#ef4444' : color,
        border: `1px solid ${borderColor}`,
        background: insufficientMoney ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
      }}>
      <span className="text-sm leading-none">{children}</span>
      {label && <span className="text-[7px] font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>}
      {cost !== undefined && <span className="text-[8px]" style={{ color: insufficientMoney ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>{cost}💰</span>}
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
  const lineColor = METRO_LINES[station.line].color;

  return (
    <div className="absolute bottom-20 left-3 px-4 py-3 rounded-xl text-xs pointer-events-auto max-w-sm animate-slide-in-left"
      style={{ background: 'rgba(8,12,28,0.94)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      
      {/* Header with station preview */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: lineColor, boxShadow: `0 0 8px ${lineColor}40` }}>
            {station.shape === 'circle' ? '●' : station.shape === 'square' ? '■' : station.shape === 'triangle' ? '▲' : station.shape === 'diamond' ? '◆' : '★'}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{station.nameUa}</p>
            <p className="text-[10px]" style={{ color: '#6b7280' }}>
              {station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3'} •
              {station.depth === 'deep' ? ' Глибока' : ' Мілка'} •
              Рів.{station.level}
              {station.isFortified ? ' 🏰' : ''}
              {station.isOnFire ? ' 🔥' : ''}
              {station.isDestroyed ? ' 💀' : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:rotate-90 hover:bg-white/10 text-sm" style={{ color: '#6b7280' }}>✕</button>
      </div>

      {/* HP bar - taller with value overlay */}
      <div className="relative w-full h-3 rounded-full mb-2 overflow-hidden" style={{ background: '#1a1a2e' }}>
        <div className="h-full rounded-full" style={{
          width: `${hpPct}%`,
          background: `linear-gradient(90deg, ${hpColor}, ${hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#fbbf24' : '#f87171'})`,
          transition: 'width 0.5s ease, background 0.3s ease',
          boxShadow: `0 0 8px ${hpColor}40`,
        }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {station.hp}/{station.maxHp} HP
        </span>
      </div>
      
      <p className="text-[10px] mb-2" style={{ color: '#9ca3af' }}>🚶 {station.passengers.length}/{station.maxPassengers} • 💰 {station.stationIncome}
        {station.hasAntiAir ? ' • 🛡️ ПРО' : ''}
        {station.hasSAM ? ' • 🚀 ЗРК' : ''}
        {station.hasAATurret ? ' • 🔫' : ''}
      </p>

      {/* Passenger shapes */}
      {station.passengers.length > 0 && (
        <div className="flex gap-0.5 mb-2 flex-wrap">
          {station.passengers.slice(0, 12).map((p, i) => (
            <span key={i} className="w-4 h-4 rounded-sm text-center leading-[16px] inline-block"
              style={{
                fontSize: '10px',
                background: p.shape === 'circle' ? '#ff6b6b' : p.shape === 'square' ? '#4ecdc4' : p.shape === 'triangle' ? '#ffe66d' : p.shape === 'diamond' ? '#a29bfe' : '#fd79a8',
                animation: p.patience < 3000 ? `heart-pulse 0.5s ease-in-out ${i * 0.05}s infinite` : undefined,
              }}>
              {p.shape === 'circle' ? '●' : p.shape === 'square' ? '■' : p.shape === 'triangle' ? '▲' : p.shape === 'diamond' ? '◆' : '★'}
            </span>
          ))}
          {station.passengers.length > 12 && <span className="text-[10px]" style={{ color: '#6b7280' }}>+{station.passengers.length - 12}</span>}
        </div>
      )}

      {/* Defense section */}
      <p className="text-[9px] mb-1 mt-1 font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>🛡️ Оборона</p>
      <div className="grid grid-cols-4 gap-1 mb-2">
        <PanelBtn onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          insufficientMoney={money < GAME_CONFIG.ANTI_AIR_COST}
          color="#3b82f6" borderColor="rgba(59,130,246,0.3)" cost={GAME_CONFIG.ANTI_AIR_COST} label="ПРО">
          🛡️
        </PanelBtn>
        <PanelBtn onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM}
          insufficientMoney={money < GAME_CONFIG.SAM_BATTERY_COST}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.SAM_BATTERY_COST} label="ЗРК">
          🚀
        </PanelBtn>
        <PanelBtn onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret}
          insufficientMoney={money < GAME_CONFIG.AA_TURRET_COST}
          color="#f59e0b" borderColor="rgba(245,158,11,0.3)" cost={GAME_CONFIG.AA_TURRET_COST} label="Тур.">
          🔫
        </PanelBtn>
        <PanelBtn onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST}
          insufficientMoney={money < GAME_CONFIG.INTERCEPTOR_COST}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.INTERCEPTOR_COST} label="Пер.">
          🛩️
        </PanelBtn>
        <PanelBtn onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          insufficientMoney={money < GAME_CONFIG.SHIELD_COST}
          color="#06b6d4" borderColor="rgba(6,182,212,0.3)" cost={GAME_CONFIG.SHIELD_COST} label="Щит">
          ⚡
        </PanelBtn>
        <PanelBtn onClick={onFortify} disabled={money < 100 || station.isFortified}
          insufficientMoney={money < 100}
          color="#9ca3af" borderColor="rgba(255,255,255,0.2)" cost={100} label="Форт">
          🏰
        </PanelBtn>
        <PanelBtn onClick={onEMP} disabled={money < 60 || station.empCooldown > 0}
          insufficientMoney={money < 60}
          color="#a855f7" borderColor="rgba(168,85,247,0.3)" cost={60} label="ЕМІ">
          ⚡
        </PanelBtn>
      </div>

      {/* Station actions */}
      <p className="text-[9px] mb-1 font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>🚇 Станція</p>
      <div className="grid grid-cols-4 gap-1">
        <PanelBtn onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * station.level}
          color="#22c55e" borderColor="rgba(34,197,94,0.3)" cost={GAME_CONFIG.UPGRADE_COST * station.level} label="Рів.↑">
          ⬆️
        </PanelBtn>
        <PanelBtn onClick={onEvacuate} disabled={station.passengers.length === 0}
          color="#f97316" borderColor="rgba(249,115,22,0.3)" label="Евак">
          🚨
        </PanelBtn>
        <PanelBtn onClick={onToggle}
          color="#9ca3af" borderColor="rgba(255,255,255,0.15)" label={station.isOpen ? 'Закр.' : 'Відкр.'}>
          {station.isOpen ? '🔒' : '🔓'}
        </PanelBtn>
        {station.depth === 'deep' && isAirRaid && (
          <PanelBtn onClick={onShelter}
            color="#f59e0b" borderColor="rgba(245,158,11,0.3)" label={station.isSheltering ? 'Вих.' : 'Схов.'}>
            {station.isSheltering ? '🏠↑' : '🏠↓'}
          </PanelBtn>
        )}
        <PanelBtn onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0}
          insufficientMoney={money < GAME_CONFIG.TUNNEL_SEAL_COST}
          color="#9ca3af" borderColor="rgba(255,255,255,0.15)" cost={GAME_CONFIG.TUNNEL_SEAL_COST} label="Тун.">
          🚧
        </PanelBtn>
        <PanelBtn onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0}
          insufficientMoney={money < GAME_CONFIG.SPEED_BOOST_COST}
          color="#a855f7" borderColor="rgba(168,85,247,0.3)" cost={GAME_CONFIG.SPEED_BOOST_COST} label="x2">
          🚀
        </PanelBtn>
        <PanelBtn onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST}
          insufficientMoney={money < GAME_CONFIG.EXPRESS_LINE_COST}
          color="#3b82f6" borderColor="rgba(59,130,246,0.3)" cost={GAME_CONFIG.EXPRESS_LINE_COST} label="Екс.">
          🚄
        </PanelBtn>
        <PanelBtn onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0}
          insufficientMoney={money < GAME_CONFIG.STATION_MAGNET_COST}
          color="#ec4899" borderColor="rgba(236,72,153,0.3)" cost={GAME_CONFIG.STATION_MAGNET_COST} label="Магн.">
          🧲
        </PanelBtn>
      </div>
    </div>
  );
});
