import React from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';
import { Train, GameStation } from '../types';
import { X, ArrowLeftRight, Merge, DollarSign, ArrowUp, Shield, RotateCcw, Train as TrainIcon } from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { useLanguage } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrainPanelProps {
  train: Train;
  stations: GameStation[];
  money: number;
  trains: Train[];
  onClose: () => void;
  onReroute: (line: string) => void;
  onMerge: (otherTrainId: string) => void;
  onSell: () => void;
  onUpgrade: () => void;
  onShield: () => void;
  onReverse: () => void;
  onHover?: () => void;
}

export const TrainPanel = React.memo(function TrainPanel({
  train, stations, money, trains,
  onClose, onReroute, onMerge, onSell, onUpgrade, onShield, onReverse, onHover,
}: TrainPanelProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const lineColor = METRO_LINES[train.line].color;
  const lineName = METRO_LINES[train.line].name;
  const upgradeCost = GAME_CONFIG.UPGRADE_COST * train.level;
  const fillRatio = train.passengers.length / train.capacity;

  const nearbyTrains = trains.filter(tr =>
    tr.id !== train.id && tr.line === train.line &&
    Math.abs(tr.x - train.x) < 0.05 && Math.abs(tr.y - train.y) < 0.05
  );

  const lines: string[] = ['red', 'blue', 'green'];
  const wagonCount = train.level;

  const panelClass = isMobile
    ? 'fixed bottom-0 left-0 right-0 z-50 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200'
    : 'absolute top-20 right-3 z-50 pointer-events-auto animate-in slide-in-from-right-4 duration-200';
  const panelStyle = isMobile ? {} : { width: '270px' };

  return (
    <div className={panelClass} style={panelStyle}>
      <div className={`rounded-t-xl sm:rounded-xl p-3 sm:p-4 ${isMobile ? 'max-h-[55vh] overflow-y-auto' : ''}`}
        style={{
          background: 'rgba(8, 12, 24, 0.98)',
          border: `1px solid ${lineColor}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${lineColor}10`,
        }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center">
              <ProgressRing progress={fillRatio} size={isMobile ? 32 : 40} strokeWidth={2.5}
                color={fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#eab308' : '#4ade80'} />
              <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-black"
                style={{ background: `${lineColor}25`, border: `2px solid ${lineColor}`, color: lineColor }}>
                {train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3'}
              </div>
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-bold" style={{ color: lineColor }}>
                {lineName.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[9px] sm:text-[10px]" style={{ color: '#7a8599' }}>
                {t('station.upgrade')}{train.level} · {train.passengers.length}/{train.capacity} {t('train.pax')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
            <X size={14} style={{ color: '#7a8599' }} />
          </button>
        </div>

        {/* Mini train */}
        <div className="flex items-center gap-1 mb-3 justify-center">
          {Array.from({ length: wagonCount }).map((_, i) => (
            <div key={i} className="rounded-sm flex items-center justify-center"
              style={{
                width: i === 0 ? '32px' : '24px',
                height: '14px',
                background: `${lineColor}${i === 0 ? '50' : '30'}`,
                border: `1.5px solid ${lineColor}`,
              }}>
              {i === 0 && <TrainIcon size={8} style={{ color: lineColor }} />}
            </div>
          ))}
          <span className="text-[9px] ml-1" style={{ color: '#5a6577' }}>
            {wagonCount} {t('train.wagons')}
          </span>
        </div>

        {/* Reroute */}
        <div className="mb-3">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5a6577' }}>
            <ArrowLeftRight size={9} className="inline mr-1" />{t('train.reroute')}
          </p>
          <div className="flex gap-1">
            {lines.map(l => {
              const c = METRO_LINES[l].color;
              const isCurrent = train.line === l;
              return (
                <button key={l} onClick={() => !isCurrent && onReroute(l)}
                  disabled={isCurrent}
                  onMouseEnter={onHover}
                  className={`flex-1 h-8 rounded-md flex items-center justify-center gap-1 transition-all
                    ${isCurrent ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'}`}
                  style={{
                    background: isCurrent ? 'rgba(20, 28, 45, 0.5)' : 'rgba(20, 28, 45, 0.95)',
                    border: `2px solid ${isCurrent ? c + '30' : c}`,
                  }}>
                  <div className="w-4 h-1 rounded-full" style={{ background: c }} />
                  <span className="text-[10px] sm:text-[11px] font-black" style={{ color: c }}>
                    {l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <PanelBtn icon={<RotateCcw size={12} />} label={t('train.reverse')} onClick={onReverse} color="#94a3b8" onHoverSound={onHover} />
          <PanelBtn icon={<ArrowUp size={12} />} label={`${t('train.upgrade')} $${upgradeCost}`} onClick={onUpgrade}
            disabled={money < upgradeCost || train.level >= 3} color="#c084fc" onHoverSound={onHover} />
          <PanelBtn icon={<Shield size={12} />} label={`${t('train.shield')}${train.shieldTimer > 0 ? ` ${Math.ceil(train.shieldTimer / 1000)}с` : ' $30'}`}
            onClick={onShield}
            disabled={money < 30 || train.shieldTimer > 0}
            active={train.shieldTimer > 0} color="#38bdf8" onHoverSound={onHover} />
          <PanelBtn icon={<DollarSign size={12} />} label={`${t('train.sell')} +$25`} onClick={onSell} color="#ef4444" onHoverSound={onHover} />
        </div>

        {/* Merge */}
        {nearbyTrains.length > 0 && (
          <div className="mt-2">
            {nearbyTrains.map(nt => (
              <button key={nt.id} onClick={() => onMerge(nt.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[10px] sm:text-[11px] font-bold transition-all hover:brightness-125 cursor-pointer"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#a855f7',
                }}>
                <Merge size={12} />
                {t('train.merge')} ({nt.passengers.length}/{nt.capacity})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function PanelBtn({ icon, label, onClick, disabled, active, color, onHoverSound }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  disabled?: boolean; active?: boolean; color: string; onHoverSound?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={onHoverSound}
      className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-md text-[10px] sm:text-[11px] font-bold transition-all
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'}
        ${active ? 'ring-1' : ''}`}
      style={{
        background: active ? `${color}20` : 'rgba(20, 28, 45, 0.95)',
        borderLeft: `2px solid ${disabled ? 'transparent' : color}`,
        color,
      }}>
      {icon}
      {label}
    </button>
  );
}
