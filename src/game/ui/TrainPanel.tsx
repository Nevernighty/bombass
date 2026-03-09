import React from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';
import { Train, GameStation } from '../types';
import { X, ArrowLeftRight, Merge, DollarSign, ArrowUp, Shield, RotateCcw, Train as TrainIcon } from 'lucide-react';
import { ProgressRing } from './ProgressRing';

interface TrainPanelProps {
  train: Train;
  stations: GameStation[];
  money: number;
  trains: Train[];
  onClose: () => void;
  onReroute: (line: 'red' | 'blue' | 'green') => void;
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
  const lineColor = METRO_LINES[train.line].color;
  const lineName = METRO_LINES[train.line].name;
  const upgradeCost = GAME_CONFIG.UPGRADE_COST * train.level;
  const fillRatio = train.passengers.length / train.capacity;

  const nearbyTrains = trains.filter(t =>
    t.id !== train.id && t.line === train.line &&
    Math.abs(t.x - train.x) < 0.05 && Math.abs(t.y - train.y) < 0.05
  );

  const lines: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];
  const wagonCount = train.level;

  return (
    <div className="absolute top-20 right-3 z-50 pointer-events-auto animate-in slide-in-from-right-4 duration-200"
      style={{ width: '270px' }}>
      <div className="rounded-xl p-4"
        style={{
          background: 'rgba(8, 12, 24, 0.98)',
          border: `1px solid ${lineColor}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${lineColor}10`,
          backdropFilter: 'blur(12px)',
        }}>
        {/* Header with HP ring */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <ProgressRing progress={fillRatio} size={40} strokeWidth={2.5}
                color={fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#eab308' : '#4ade80'} />
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black"
                style={{ background: `${lineColor}25`, border: `2px solid ${lineColor}`, color: lineColor }}>
                {train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3'}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: lineColor }}>
                {lineName.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[10px]" style={{ color: '#7a8599' }}>
                Рів.{train.level} · {train.passengers.length}/{train.capacity} пас.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
            <X size={14} style={{ color: '#7a8599' }} />
          </button>
        </div>

        {/* Mini train visualization */}
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
            {wagonCount} ваг.
          </span>
        </div>

        {/* Visual line picker for rerouting */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#5a6577' }}>
            <ArrowLeftRight size={9} className="inline mr-1" />Перемаршрутити
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
                  <span className="text-[11px] font-black" style={{ color: c }}>
                    {l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions grid */}
        <div className="grid grid-cols-2 gap-1.5">
          <PanelBtn icon={<RotateCcw size={12} />} label="Розворот" onClick={onReverse} color="#94a3b8" onHoverSound={onHover} />
          <PanelBtn icon={<ArrowUp size={12} />} label={`Апгрейд $${upgradeCost}`} onClick={onUpgrade}
            disabled={money < upgradeCost || train.level >= 3} color="#c084fc" onHoverSound={onHover} />
          <PanelBtn icon={<Shield size={12} />} label={`Щит${train.shieldTimer > 0 ? ` ${Math.ceil(train.shieldTimer / 1000)}с` : ' $30'}`}
            onClick={onShield}
            disabled={money < 30 || train.shieldTimer > 0}
            active={train.shieldTimer > 0} color="#38bdf8" onHoverSound={onHover} />
          <PanelBtn icon={<DollarSign size={12} />} label="Продати +$25" onClick={onSell} color="#ef4444" onHoverSound={onHover} />
        </div>

        {/* Merge */}
        {nearbyTrains.length > 0 && (
          <div className="mt-2">
            {nearbyTrains.map(nt => (
              <button key={nt.id} onClick={() => onMerge(nt.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all hover:brightness-125 cursor-pointer"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#a855f7',
                }}>
                <Merge size={12} />
                Об'єднати ({nt.passengers.length}/{nt.capacity})
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
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-bold transition-all
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
