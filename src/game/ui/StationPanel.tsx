import React from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG, METRO_LINES } from '../constants';
import { X } from 'lucide-react';

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

function PanelBtn({ onClick, disabled, children, cost, insufficientMoney }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  cost?: number;
  insufficientMoney?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all
        disabled:opacity-25 hover:bg-muted/40"
      style={{
        background: insufficientMoney ? 'hsla(0, 72%, 51%, 0.05)' : 'hsla(var(--muted), 0.3)',
        border: '1px solid hsl(var(--border))',
        color: insufficientMoney ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
      }}>
      <span className="font-medium">{children}</span>
      {cost !== undefined && (
        <span className="text-[10px] ml-2" style={{ color: insufficientMoney ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
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
  const hpPct = (station.hp / station.maxHp) * 100;
  const hpColor = hpPct > 60 ? 'hsl(145, 63%, 49%)' : hpPct > 30 ? 'hsl(var(--game-accent))' : 'hsl(var(--destructive))';
  const lineColor = METRO_LINES[station.line].color;
  const lineName = station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3';

  return (
    <div className="absolute bottom-20 left-3 px-4 py-3 rounded-lg text-xs pointer-events-auto w-72 animate-slide-in-left game-panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full" style={{ background: lineColor }} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{station.nameUa}</p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {lineName} · {station.depth === 'deep' ? 'Глибока' : 'Мілка'} · Рів.{station.level}
              {station.isFortified ? ' · Форт' : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/50 transition-colors">
          <X size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </button>
      </div>

      {/* HP bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${hpPct}%`,
            background: hpColor,
          }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color: hpColor }}>{station.hp}/{station.maxHp}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <span>{station.passengers.length}/{station.maxPassengers} пас.</span>
        <span>${station.stationIncome}/дост.</span>
        {station.hasAntiAir && <span style={{ color: 'hsl(204, 70%, 53%)' }}>ПРО</span>}
        {station.hasSAM && <span style={{ color: 'hsl(145, 63%, 49%)' }}>ЗРК</span>}
        {station.hasAATurret && <span style={{ color: 'hsl(var(--game-accent))' }}>Тур.</span>}
      </div>

      {/* Passenger shapes */}
      {station.passengers.length > 0 && (
        <div className="flex gap-0.5 mb-3 flex-wrap">
          {station.passengers.slice(0, 12).map((p, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-sm text-center leading-[14px] inline-block text-[9px]"
              style={{
                background: p.shape === 'circle' ? 'hsl(0, 65%, 65%)' : p.shape === 'square' ? 'hsl(175, 55%, 55%)' : p.shape === 'triangle' ? 'hsl(50, 90%, 65%)' : p.shape === 'diamond' ? 'hsl(250, 60%, 70%)' : 'hsl(340, 60%, 65%)',
                color: 'hsl(var(--game-bg))',
                animation: p.patience < 3000 ? 'heart-pulse 0.5s ease-in-out infinite' : undefined,
              }}>
              {p.shape === 'circle' ? '●' : p.shape === 'square' ? '■' : p.shape === 'triangle' ? '▲' : p.shape === 'diamond' ? '◆' : '★'}
            </span>
          ))}
          {station.passengers.length > 12 && <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>+{station.passengers.length - 12}</span>}
        </div>
      )}

      {/* Defense section */}
      <p className="text-[9px] mb-1 font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5 }}>Оборона</p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <PanelBtn onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          insufficientMoney={money < GAME_CONFIG.ANTI_AIR_COST} cost={GAME_CONFIG.ANTI_AIR_COST}>
          ПРО
        </PanelBtn>
        <PanelBtn onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM}
          insufficientMoney={money < GAME_CONFIG.SAM_BATTERY_COST} cost={GAME_CONFIG.SAM_BATTERY_COST}>
          ЗРК
        </PanelBtn>
        <PanelBtn onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret}
          insufficientMoney={money < GAME_CONFIG.AA_TURRET_COST} cost={GAME_CONFIG.AA_TURRET_COST}>
          Турель
        </PanelBtn>
        <PanelBtn onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST}
          insufficientMoney={money < GAME_CONFIG.INTERCEPTOR_COST} cost={GAME_CONFIG.INTERCEPTOR_COST}>
          Перехоп.
        </PanelBtn>
        <PanelBtn onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          insufficientMoney={money < GAME_CONFIG.SHIELD_COST} cost={GAME_CONFIG.SHIELD_COST}>
          Щит
        </PanelBtn>
        <PanelBtn onClick={onFortify} disabled={money < 100 || station.isFortified}
          insufficientMoney={money < 100} cost={100}>
          Форт
        </PanelBtn>
        <PanelBtn onClick={onEMP} disabled={money < 60 || station.empCooldown > 0}
          insufficientMoney={money < 60} cost={60}>
          ЕМІ
        </PanelBtn>
      </div>

      {/* Station actions */}
      <p className="text-[9px] mb-1 font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5 }}>Станція</p>
      <div className="grid grid-cols-2 gap-1">
        <PanelBtn onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * station.level} cost={GAME_CONFIG.UPGRADE_COST * station.level}>
          Рівень ↑
        </PanelBtn>
        <PanelBtn onClick={onEvacuate} disabled={station.passengers.length === 0}>
          Евакуація
        </PanelBtn>
        <PanelBtn onClick={onToggle}>
          {station.isOpen ? 'Закрити' : 'Відкрити'}
        </PanelBtn>
        {station.depth === 'deep' && isAirRaid && (
          <PanelBtn onClick={onShelter}>
            {station.isSheltering ? 'Вийти' : 'Сховок'}
          </PanelBtn>
        )}
        <PanelBtn onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0}
          insufficientMoney={money < GAME_CONFIG.TUNNEL_SEAL_COST} cost={GAME_CONFIG.TUNNEL_SEAL_COST}>
          Тунель
        </PanelBtn>
        <PanelBtn onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0}
          insufficientMoney={money < GAME_CONFIG.SPEED_BOOST_COST} cost={GAME_CONFIG.SPEED_BOOST_COST}>
          Прискор.
        </PanelBtn>
        <PanelBtn onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST}
          insufficientMoney={money < GAME_CONFIG.EXPRESS_LINE_COST} cost={GAME_CONFIG.EXPRESS_LINE_COST}>
          Експрес
        </PanelBtn>
        <PanelBtn onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0}
          insufficientMoney={money < GAME_CONFIG.STATION_MAGNET_COST} cost={GAME_CONFIG.STATION_MAGNET_COST}>
          Магніт
        </PanelBtn>
      </div>
    </div>
  );
});
