import React, { useState, useRef, useCallback } from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG, METRO_LINES } from '../constants';
import { X, Shield, Crosshair, Rocket, Zap, ArrowUp, Users, Lock, Unlock, Mountain, Gauge, Train, Magnet, Hammer } from 'lucide-react';
import { ProgressRing } from './ProgressRing';

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

type Tab = 'defense' | 'manage' | 'info';

function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer
        ${active ? 'text-white' : 'hover:brightness-125'}`}
      style={{
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? '#fff' : 'rgba(180,190,210,0.6)',
      }}>
      {label}
    </button>
  );
}

function ActionBtn({ icon, label, cost, onClick, disabled, active }: {
  icon: React.ReactNode; label: string; cost?: number; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  const [showTip, setShowTip] = useState(false);
  const insufficient = cost !== undefined && disabled;

  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
      className={`relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[11px] font-bold transition-all
        ${disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:brightness-125'}
        ${active ? 'ring-1 ring-white/20' : ''}`}
      style={{
        background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        borderLeft: `3px solid ${disabled ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
      }}>
      <span style={{ color: 'rgba(180,190,210,0.9)' }}>{icon}</span>
      <span className="flex-1 text-left" style={{ color: 'rgba(230,235,245,0.9)' }}>{label}</span>
      {cost !== undefined && (
        <span className="text-[10px] font-mono" style={{ color: insufficient ? '#ef4444' : '#4ade80' }}>
          ${cost}
        </span>
      )}
    </button>
  );
}

export const StationPanel = React.memo(function StationPanel({
  station, money, isAirRaid, speedBoostCooldown, stationMagnetTimer,
  onClose, onDeployAA, onShield, onUpgrade, onEvacuate, onToggle,
  onShelter, onSealTunnel, onSpeedBoost, onExpressLine, onStationMagnet,
  onBuySAM, onBuyAATurret, onLaunchInterceptor, onFortify, onEMP,
}: StationPanelProps) {
  const [tab, setTab] = useState<Tab>('defense');
  const hpPct = (station.hp / station.maxHp) * 100;
  const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#eab308' : '#ef4444';
  const lineColor = METRO_LINES[station.line].color;
  const lineName = station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3';
  const fillRatio = station.passengers.length / station.maxPassengers;

  return (
    <div className="absolute bottom-20 left-3 z-50 pointer-events-auto animate-in slide-in-from-left-4 duration-200"
      style={{ width: '300px' }}>
      <div className="rounded-xl p-4 backdrop-blur-md"
        style={{
          background: 'rgba(8, 12, 24, 0.97)',
          border: `1px solid ${lineColor}30`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${lineColor}10`,
        }}>
        {/* Header with circular HP */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <ProgressRing progress={hpPct / 100} size={44} strokeWidth={3} color={hpColor} />
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
              style={{ background: `${lineColor}20`, border: `2px solid ${lineColor}`, color: lineColor }}>
              {lineName}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: '#e0e8f0' }}>{station.nameUa}</p>
            <p className="text-[10px]" style={{ color: 'rgba(180,190,210,0.6)' }}>
              {station.depth === 'deep' ? 'Глибока' : 'Мілка'} · Рів.{station.level}
              {station.isFortified && ' · Укріплена'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
            <X size={14} style={{ color: 'rgba(180,190,210,0.6)' }} />
          </button>
        </div>

        {/* Passenger fill bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${fillRatio * 100}%`,
            background: fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#f59e0b' : '#4ade80',
          }} />
        </div>
        <div className="flex items-center gap-3 mb-3 text-[10px]" style={{ color: 'rgba(180,190,210,0.5)' }}>
          <span>{station.passengers.length}/{station.maxPassengers} пас.</span>
          <span>{station.hp}/{station.maxHp} HP</span>
          <span>${station.stationIncome}/дост.</span>
          {station.hasAntiAir && <span style={{ color: '#38bdf8' }}>ППО</span>}
          {station.hasSAM && <span style={{ color: '#4ade80' }}>ЗРК</span>}
        </div>

        {/* Passenger shapes grid */}
        {station.passengers.length > 0 && (
          <div className="flex gap-0.5 mb-3 flex-wrap">
            {station.passengers.slice(0, 16).map((p, i) => (
              <span key={i} className="w-3 h-3 rounded-sm text-center leading-[12px] inline-block text-[8px]"
                style={{
                  background: p.shape === 'circle' ? 'hsl(0, 65%, 65%)' : p.shape === 'square' ? 'hsl(175, 55%, 55%)' : p.shape === 'triangle' ? 'hsl(50, 90%, 65%)' : p.shape === 'diamond' ? 'hsl(250, 60%, 70%)' : 'hsl(340, 60%, 65%)',
                  color: '#0a0e1a',
                  animation: p.patience < 3000 ? 'heart-pulse 0.5s ease-in-out infinite' : undefined,
                }}>
                {p.shape === 'circle' ? '●' : p.shape === 'square' ? '■' : p.shape === 'triangle' ? '▲' : p.shape === 'diamond' ? '◆' : '★'}
              </span>
            ))}
            {station.passengers.length > 16 && <span className="text-[9px]" style={{ color: 'rgba(180,190,210,0.5)' }}>+{station.passengers.length - 16}</span>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <TabBtn active={tab === 'defense'} label="Оборона" onClick={() => setTab('defense')} />
          <TabBtn active={tab === 'manage'} label="Управління" onClick={() => setTab('manage')} />
          <TabBtn active={tab === 'info'} label="Інфо" onClick={() => setTab('info')} />
        </div>

        {/* Tab content */}
        <div className="flex flex-col gap-1">
          {tab === 'defense' && (
            <>
              <ActionBtn icon={<Crosshair size={14} />} label="Зенітка" cost={GAME_CONFIG.ANTI_AIR_COST}
                onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir} active={station.hasAntiAir} />
              <ActionBtn icon={<Rocket size={14} />} label="ЗРК" cost={GAME_CONFIG.SAM_BATTERY_COST}
                onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM} active={station.hasSAM} />
              <ActionBtn icon={<Shield size={14} />} label={`Щит${station.shieldTimer > 0 ? ` (${Math.ceil(station.shieldTimer / 1000)}с)` : ''}`}
                cost={GAME_CONFIG.SHIELD_COST} onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0} />
              <ActionBtn icon={<Hammer size={14} />} label="Укріплення" cost={100}
                onClick={onFortify} disabled={money < 100 || station.isFortified} active={station.isFortified} />
              <ActionBtn icon={<Zap size={14} />} label={`EMP${station.empCooldown > 0 ? ` (${Math.ceil(station.empCooldown / 1000)}с)` : ''}`}
                cost={60} onClick={onEMP} disabled={money < 60 || station.empCooldown > 0} />
              <ActionBtn icon={<Rocket size={14} />} label="Перехоплювач" cost={GAME_CONFIG.INTERCEPTOR_COST}
                onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST} />
              <ActionBtn icon={<Crosshair size={14} />} label="Турель" cost={GAME_CONFIG.AA_TURRET_COST}
                onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret} active={station.hasAATurret} />
            </>
          )}
          {tab === 'manage' && (
            <>
              <ActionBtn icon={<ArrowUp size={14} />} label={`Покращити (Рів.${station.level + 1})`}
                cost={GAME_CONFIG.UPGRADE_COST * station.level} onClick={onUpgrade}
                disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3} />
              <ActionBtn icon={<Users size={14} />} label="Евакуація" onClick={onEvacuate}
                disabled={station.passengers.length === 0} />
              <ActionBtn icon={station.isOpen ? <Lock size={14} /> : <Unlock size={14} />}
                label={station.isOpen ? 'Закрити станцію' : 'Відкрити станцію'} onClick={onToggle} />
              {station.depth === 'deep' && isAirRaid && (
                <ActionBtn icon={<Mountain size={14} />}
                  label={station.isSheltering ? 'Вийти з укриття' : 'Режим укриття'} onClick={onShelter} />
              )}
              <ActionBtn icon={<Shield size={14} />} label="Герметизація" cost={GAME_CONFIG.TUNNEL_SEAL_COST}
                onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0} />
              <ActionBtn icon={<Gauge size={14} />} label="Прискорення" cost={GAME_CONFIG.SPEED_BOOST_COST}
                onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0} />
              <ActionBtn icon={<Train size={14} />} label="Експрес" cost={GAME_CONFIG.EXPRESS_LINE_COST}
                onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST} />
              <ActionBtn icon={<Magnet size={14} />} label="Магніт пас." cost={GAME_CONFIG.STATION_MAGNET_COST}
                onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0} />
            </>
          )}
          {tab === 'info' && (
            <div className="text-[11px] space-y-1.5 py-1" style={{ color: 'rgba(180,190,210,0.7)' }}>
              <div className="flex justify-between"><span>Лінія</span><span style={{ color: lineColor }}>{METRO_LINES[station.line].name}</span></div>
              <div className="flex justify-between"><span>Глибина</span><span>{station.depth === 'deep' ? 'Глибока' : 'Мілка'}</span></div>
              <div className="flex justify-between"><span>Рівень</span><span>{station.level}/3</span></div>
              <div className="flex justify-between"><span>Місткість</span><span>{station.maxPassengers} пас.</span></div>
              <div className="flex justify-between"><span>Дохід</span><span>${station.stationIncome}/дост.</span></div>
              <div className="flex justify-between"><span>HP</span><span style={{ color: hpColor }}>{station.hp}/{station.maxHp}</span></div>
              <div className="flex justify-between"><span>Укриття</span><span>{station.shelterCount}</span></div>
              {station.isTransfer && <div className="text-[10px] font-bold mt-1" style={{ color: '#fbbf24' }}>⇄ Пересадочна станція</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
