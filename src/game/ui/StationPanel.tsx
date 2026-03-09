import React, { useState } from 'react';
import { GameStation } from '../types';
import { GAME_CONFIG, METRO_LINES } from '../constants';
import { X, Shield, Crosshair, Rocket, Zap, ArrowUp, Users, Lock, Unlock, Mountain, Gauge, Train, Magnet, Hammer, Heart, Coins, Radio } from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { useLanguage } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onHover?: () => void;
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

function GridBtn({ icon, label, cost, onClick, disabled, active, timer, delay, onHoverSound }: {
  icon: React.ReactNode; label: string; cost?: number; onClick: () => void;
  disabled?: boolean; active?: boolean; timer?: string; delay?: number; onHoverSound?: () => void;
}) {
  const insufficient = cost !== undefined && disabled;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={onHoverSound}
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
      <span className="text-[9px] sm:text-[10px] font-bold leading-tight text-center" style={{ color: '#d0d8e8' }}>{label}</span>
      {cost !== undefined && (
        <span className="absolute top-1 right-1.5 text-[9px] sm:text-[10px] font-mono font-bold"
          style={{ color: insufficient ? '#ef4444' : '#4ade80' }}>
          ${cost}
        </span>
      )}
      {timer && (
        <span className="absolute bottom-1 right-1.5 text-[8px] sm:text-[9px] font-mono font-bold" style={{ color: '#38bdf8' }}>
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
  onBuySAM, onBuyAATurret, onLaunchInterceptor, onFortify, onEMP, onHover,
}: StationPanelProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>('defense');
  const hpPct = (station.hp / station.maxHp) * 100;
  const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#eab308' : '#ef4444';
  const lineColor = METRO_LINES[station.line].color;
  const lineName = station.line === 'red' ? 'M1' : station.line === 'blue' ? 'M2' : 'M3';
  const fillRatio = station.passengers.length / station.maxPassengers;

  const defenseActions = [
    { icon: <Crosshair size={16} />, label: t('station.aa'), cost: GAME_CONFIG.ANTI_AIR_COST, onClick: onDeployAA, disabled: money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir, active: station.hasAntiAir },
    { icon: <Rocket size={16} />, label: t('station.sam'), cost: GAME_CONFIG.SAM_BATTERY_COST, onClick: onBuySAM, disabled: money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM, active: station.hasSAM },
    { icon: <Shield size={16} />, label: t('station.shield'), cost: GAME_CONFIG.SHIELD_COST, onClick: onShield, disabled: money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0, timer: station.shieldTimer > 0 ? `${Math.ceil(station.shieldTimer / 1000)}с` : undefined },
    { icon: <Hammer size={16} />, label: t('station.fortify'), cost: 100, onClick: onFortify, disabled: money < 100 || station.isFortified, active: station.isFortified },
    { icon: <Zap size={16} />, label: t('station.emp'), cost: 60, onClick: onEMP, disabled: money < 60 || station.empCooldown > 0, timer: station.empCooldown > 0 ? `${Math.ceil(station.empCooldown / 1000)}с` : undefined },
    { icon: <Rocket size={16} />, label: t('station.intercept'), cost: GAME_CONFIG.INTERCEPTOR_COST, onClick: onLaunchInterceptor, disabled: money < GAME_CONFIG.INTERCEPTOR_COST },
    { icon: <Crosshair size={16} />, label: t('station.turret'), cost: GAME_CONFIG.AA_TURRET_COST, onClick: onBuyAATurret, disabled: money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret, active: station.hasAATurret },
  ];

  const manageActions = [
    { icon: <ArrowUp size={16} />, label: `${t('station.upgrade')}${station.level + 1}`, cost: GAME_CONFIG.UPGRADE_COST * station.level, onClick: onUpgrade, disabled: money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3 },
    { icon: <Users size={16} />, label: t('station.evacuate'), onClick: onEvacuate, disabled: station.passengers.length === 0 },
    { icon: station.isOpen ? <Lock size={16} /> : <Unlock size={16} />, label: station.isOpen ? t('station.close') : t('station.open'), onClick: onToggle },
    ...(station.depth === 'deep' && isAirRaid ? [{ icon: <Mountain size={16} />, label: station.isSheltering ? t('station.shelter_out') : t('station.shelter_in'), onClick: onShelter }] : []),
    { icon: <Shield size={16} />, label: t('station.seal'), cost: GAME_CONFIG.TUNNEL_SEAL_COST, onClick: onSealTunnel, disabled: money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0 },
    { icon: <Gauge size={16} />, label: t('station.speed'), cost: GAME_CONFIG.SPEED_BOOST_COST, onClick: onSpeedBoost, disabled: money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0 },
    { icon: <Train size={16} />, label: t('station.express'), cost: GAME_CONFIG.EXPRESS_LINE_COST, onClick: onExpressLine, disabled: money < GAME_CONFIG.EXPRESS_LINE_COST },
    { icon: <Magnet size={16} />, label: t('station.magnet'), cost: GAME_CONFIG.STATION_MAGNET_COST, onClick: onStationMagnet, disabled: money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0 },
  ];

  const hasDefense = station.hasAntiAir || station.hasSAM || station.hasAATurret;

  // Mobile: bottom sheet. Desktop: side panel.
  const panelClass = isMobile
    ? 'fixed bottom-0 left-0 right-0 z-50 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200'
    : 'absolute bottom-20 left-3 z-50 pointer-events-auto animate-slide-in-left';
  const panelStyle = isMobile ? {} : { width: '280px' };

  return (
    <div className={panelClass} style={panelStyle}>
      <div className={`rounded-t-xl sm:rounded-xl overflow-hidden ${isMobile ? 'max-h-[60vh] overflow-y-auto' : ''}`}
        style={{
          background: 'rgba(8, 12, 24, 1)',
          border: `1px solid ${lineColor}40`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 24px ${lineColor}10`,
        }}>

        <div className="h-1" style={{ background: `linear-gradient(90deg, ${lineColor}, ${lineColor}60)` }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-3 sm:px-4 pt-2 sm:pt-3 pb-2">
          <div className="relative w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center flex-shrink-0">
            <ProgressRing progress={hpPct / 100} size={isMobile ? 32 : 40} strokeWidth={2.5} color={hpColor} />
            <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black"
              style={{ background: `${lineColor}25`, border: `2px solid ${lineColor}`, color: lineColor }}>
              {lineName}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] sm:text-[13px] font-bold truncate" style={{ color: '#e8edf5' }}>{station.nameUa}</p>
            <p className="text-[9px] sm:text-[10px] font-medium" style={{ color: '#7a8599' }}>
              {station.depth === 'deep' ? t('station.deep') : t('station.shallow')} · {t('station.upgrade')}{station.level}
              {station.isFortified && ' · 🛡️'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors cursor-pointer"
            style={{ background: 'rgba(20, 28, 45, 0.9)' }}>
            <X size={12} style={{ color: '#7a8599' }} />
          </button>
        </div>

        {/* Passenger fill bar */}
        <div className="mx-3 sm:mx-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(20, 28, 45, 0.9)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${fillRatio * 100}%`,
            background: fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#eab308' : '#4ade80',
          }} />
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 overflow-x-auto">
          <StatusChip icon={<Heart size={10} />} value={`${station.hp}`} color={hpColor} label={t('station.hp')} />
          <StatusChip icon={<Users size={10} />} value={`${station.passengers.length}/${station.maxPassengers}`}
            color={fillRatio > 0.8 ? '#ef4444' : '#d0d8e8'} label={t('topbar.passengers')} />
          <StatusChip icon={<Coins size={10} />} value={`$${station.stationIncome}`} color="#f59e0b" label={t('station.income')} />
          {hasDefense && <StatusChip icon={<Radio size={10} />} value={t('station.defense_label')} color="#38bdf8" label={t('station.defense_label')} />}
        </div>

        {/* Tabs */}
        <div className="flex mx-3 sm:mx-4 mb-2 rounded-lg overflow-hidden" style={{ background: 'rgba(12, 18, 32, 1)' }}>
          {(['defense', 'manage', 'info'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className="flex-1 py-1.5 text-[9px] sm:text-[10px] font-bold tracking-wide transition-all cursor-pointer"
              style={{
                background: tab === tb ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: tab === tb ? '#38bdf8' : '#6b7a8d',
                borderBottom: tab === tb ? '2px solid #38bdf8' : '2px solid transparent',
              }}>
              {tb === 'defense' ? t('station.defense_tab') : tb === 'manage' ? t('station.manage_tab') : t('station.info_tab')}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          {tab === 'defense' && (
            <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5`} style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {defenseActions.map((a, i) => (
                <GridBtn key={i} {...a} delay={i * 0.04} onHoverSound={onHover} />
              ))}
            </div>
          )}
          {tab === 'manage' && (
            <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5`} style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {manageActions.map((a, i) => (
                <GridBtn key={i} {...a} delay={i * 0.04} onHoverSound={onHover} />
              ))}
            </div>
          )}
          {tab === 'info' && (
            <div className="space-y-1.5" style={{ animation: 'mode-card-in 0.2s ease-out both' }}>
              {[
                { k: t('station.line'), v: METRO_LINES[station.line].name, c: lineColor },
                { k: t('station.depth'), v: station.depth === 'deep' ? t('station.deep') : t('station.shallow') },
                { k: t('station.level'), v: `${station.level}/3` },
                { k: t('station.capacity'), v: `${station.maxPassengers} ${t('station.pax')}` },
                { k: t('station.income'), v: `$${station.stationIncome}${t('station.per_del')}` },
                { k: t('station.hp'), v: `${station.hp}/${station.maxHp}`, c: hpColor },
                { k: t('station.shelters'), v: `${station.shelterCount}` },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-[10px] sm:text-[11px] py-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#7a8599' }}>{row.k}</span>
                  <span className="font-bold" style={{ color: row.c || '#d0d8e8' }}>{row.v}</span>
                </div>
              ))}
              {station.isTransfer && (
                <div className="text-[10px] sm:text-[11px] font-bold text-center py-1.5 rounded" style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                }}>⇄ {t('station.transfer')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
