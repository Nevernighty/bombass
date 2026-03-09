import React, { useState } from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG, METRO_LINES } from '../constants';
import { X, Shield, Crosshair, Rocket, Zap, ArrowUp, Users, Lock, Unlock, Mountain, Gauge, Train, Magnet, Hammer, Heart, Coins, Radio } from 'lucide-react';
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

function StatusChip({ icon, value, color, label }: { icon: React.ReactNode; value: string; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(15, 22, 38, 1)' }} title={label}>
      <span style={{ color }}>{icon}</span>
      <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

function GridBtn({ icon, label, cost, onClick, disabled, active, timer, delay }: {
  icon: React.ReactNode; label: string; cost?: number; onClick: () => void;
  disabled?: boolean; active?: boolean; timer?: string; delay?: number;
}) {
  const insufficient = cost !== undefined && disabled;
  return (
    <button onClick={onClick} disabled={disabled}
      className="relative flex flex-col items-center justify-center gap-1 rounded-lg transition-all cursor-pointer"
      style={{
        width: '100%',
        aspectRatio: '1',
        background: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 28, 45, 1)',
        border: active ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        animation: delay !== undefined ? `mode-card-in 0.25s ease-out ${delay}s both` : undefined,
      }}>
      <span style={{ color: active ? '#38bdf8' : '#94a3b8' }}>{icon}</span>
      <span className="text-[10px] font-bold leading-tight text-center" style={{ color: '#d0d8e8' }}>{label}</span>
      {cost !== undefined && (
        <span className="absolute top-1 right-1.5 text-[10px] font-mono font-bold"
          style={{ color: insufficient ? '#ef4444' : '#4ade80' }}>
          ${cost}
        </span>
      )}
      {timer && (
        <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold" style={{ color: '#38bdf8' }}>
          {timer}
        </span>
      )}
      {active && (
        <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#38bdf8' }} />
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

  const defenseActions = [
    { icon: <Crosshair size={16} />, label: 'Зенітка', cost: GAME_CONFIG.ANTI_AIR_COST, onClick: onDeployAA, disabled: money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir, active: station.hasAntiAir },
    { icon: <Rocket size={16} />, label: 'ЗРК', cost: GAME_CONFIG.SAM_BATTERY_COST, onClick: onBuySAM, disabled: money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM, active: station.hasSAM },
    { icon: <Shield size={16} />, label: 'Щит', cost: GAME_CONFIG.SHIELD_COST, onClick: onShield, disabled: money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0, timer: station.shieldTimer > 0 ? `${Math.ceil(station.shieldTimer / 1000)}с` : undefined },
    { icon: <Hammer size={16} />, label: 'Укріпл.', cost: 100, onClick: onFortify, disabled: money < 100 || station.isFortified, active: station.isFortified },
    { icon: <Zap size={16} />, label: 'EMP', cost: 60, onClick: onEMP, disabled: money < 60 || station.empCooldown > 0, timer: station.empCooldown > 0 ? `${Math.ceil(station.empCooldown / 1000)}с` : undefined },
    { icon: <Rocket size={16} />, label: 'Перехопл.', cost: GAME_CONFIG.INTERCEPTOR_COST, onClick: onLaunchInterceptor, disabled: money < GAME_CONFIG.INTERCEPTOR_COST },
    { icon: <Crosshair size={16} />, label: 'Турель', cost: GAME_CONFIG.AA_TURRET_COST, onClick: onBuyAATurret, disabled: money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret, active: station.hasAATurret },
  ];

  const manageActions = [
    { icon: <ArrowUp size={16} />, label: `Рів.${station.level + 1}`, cost: GAME_CONFIG.UPGRADE_COST * station.level, onClick: onUpgrade, disabled: money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3 },
    { icon: <Users size={16} />, label: 'Евакуація', onClick: onEvacuate, disabled: station.passengers.length === 0 },
    { icon: station.isOpen ? <Lock size={16} /> : <Unlock size={16} />, label: station.isOpen ? 'Закрити' : 'Відкрити', onClick: onToggle },
    ...(station.depth === 'deep' && isAirRaid ? [{ icon: <Mountain size={16} />, label: station.isSheltering ? 'Вийти' : 'Укриття', onClick: onShelter }] : []),
    { icon: <Shield size={16} />, label: 'Герметиз.', cost: GAME_CONFIG.TUNNEL_SEAL_COST, onClick: onSealTunnel, disabled: money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0 },
    { icon: <Gauge size={16} />, label: 'Приск.', cost: GAME_CONFIG.SPEED_BOOST_COST, onClick: onSpeedBoost, disabled: money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0 },
    { icon: <Train size={16} />, label: 'Експрес', cost: GAME_CONFIG.EXPRESS_LINE_COST, onClick: onExpressLine, disabled: money < GAME_CONFIG.EXPRESS_LINE_COST },
    { icon: <Magnet size={16} />, label: 'Магніт', cost: GAME_CONFIG.STATION_MAGNET_COST, onClick: onStationMagnet, disabled: money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0 },
  ];

  const hasDefense = station.hasAntiAir || station.hasSAM || station.hasAATurret;

  return (
    <div className="absolute bottom-20 left-3 z-50 pointer-events-auto animate-slide-in-left"
      style={{ width: '280px' }}>
      <div className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(8, 12, 24, 1)',
          border: `1px solid ${lineColor}40`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 24px ${lineColor}10`,
          backdropFilter: 'blur(12px)',
        }}>

        {/* Status bar top accent */}
        <div className="h-1" style={{
          background: `linear-gradient(90deg, ${lineColor}, ${lineColor}60)`,
        }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            <ProgressRing progress={hpPct / 100} size={40} strokeWidth={2.5} color={hpColor} />
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: `${lineColor}25`, border: `2px solid ${lineColor}`, color: lineColor }}>
              {lineName}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: '#e8edf5' }}>{station.nameUa}</p>
            <p className="text-[10px] font-medium" style={{ color: '#7a8599' }}>
              {station.depth === 'deep' ? 'Глибока' : 'Мілка'} · Рів.{station.level}
              {station.isFortified && ' · 🛡️'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors cursor-pointer"
            style={{ background: 'rgba(20, 28, 45, 0.9)' }}>
            <X size={12} style={{ color: '#7a8599' }} />
          </button>
        </div>

        {/* Passenger fill bar */}
        <div className="mx-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(20, 28, 45, 0.9)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${fillRatio * 100}%`,
            background: fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#eab308' : '#4ade80',
          }} />
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
          <StatusChip icon={<Heart size={10} />} value={`${station.hp}`} color={hpColor} label="HP" />
          <StatusChip icon={<Users size={10} />} value={`${station.passengers.length}/${station.maxPassengers}`}
            color={fillRatio > 0.8 ? '#ef4444' : '#d0d8e8'} label="Пасажири" />
          <StatusChip icon={<Coins size={10} />} value={`$${station.stationIncome}`} color="#f59e0b" label="Дохід" />
          {hasDefense && <StatusChip icon={<Radio size={10} />} value="ППО" color="#38bdf8" label="Оборона" />}
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mb-2 rounded-lg overflow-hidden" style={{ background: 'rgba(12, 18, 32, 1)' }}>
          {(['defense', 'manage', 'info'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 text-[10px] font-bold tracking-wide transition-all cursor-pointer"
              style={{
                background: tab === t ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: tab === t ? '#38bdf8' : '#6b7a8d',
                borderBottom: tab === t ? '2px solid #38bdf8' : '2px solid transparent',
              }}>
              {t === 'defense' ? 'ОБОРОНА' : t === 'manage' ? 'КЕРУВ.' : 'ІНФО'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 pb-4">
          {tab === 'defense' && (
            <div className="grid grid-cols-3 gap-1.5" style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {defenseActions.map((a, i) => (
                <GridBtn key={i} {...a} delay={i * 0.04} />
              ))}
            </div>
          )}
          {tab === 'manage' && (
            <div className="grid grid-cols-3 gap-1.5" style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {manageActions.map((a, i) => (
                <GridBtn key={i} {...a} delay={i * 0.04} />
              ))}
            </div>
          )}
          {tab === 'info' && (
            <div className="space-y-1.5" style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {[
                { k: 'Лінія', v: METRO_LINES[station.line].name, c: lineColor },
                { k: 'Глибина', v: station.depth === 'deep' ? 'Глибока' : 'Мілка' },
                { k: 'Рівень', v: `${station.level}/3` },
                { k: 'Місткість', v: `${station.maxPassengers} пас.` },
                { k: 'Дохід', v: `$${station.stationIncome}/дост.` },
                { k: 'HP', v: `${station.hp}/${station.maxHp}`, c: hpColor },
                { k: 'Укриття', v: `${station.shelterCount}` },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-[11px] py-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#7a8599' }}>{row.k}</span>
                  <span className="font-bold" style={{ color: row.c || '#d0d8e8' }}>{row.v}</span>
                </div>
              ))}
              {station.isTransfer && (
                <div className="text-[11px] font-bold text-center py-1.5 rounded" style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                }}>⇄ Пересадочна станція</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
