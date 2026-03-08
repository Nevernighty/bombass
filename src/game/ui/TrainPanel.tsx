import React, { useState } from 'react';
import { METRO_LINES, GAME_CONFIG, STATION_MAP } from '../constants';
import { Train, GameStation } from '../types';
import { X, ArrowLeftRight, Merge, DollarSign, ArrowUp, Shield, RotateCcw } from 'lucide-react';

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
}

export const TrainPanel = React.memo(function TrainPanel({
  train, stations, money, trains,
  onClose, onReroute, onMerge, onSell, onUpgrade, onShield, onReverse,
}: TrainPanelProps) {
  const lineColor = METRO_LINES[train.line].color;
  const lineName = METRO_LINES[train.line].name;
  const upgradeCost = GAME_CONFIG.UPGRADE_COST * train.level;
  const fillRatio = train.passengers.length / train.capacity;

  // Find nearby trains on same line for merge
  const nearbyTrains = trains.filter(t =>
    t.id !== train.id && t.line === train.line &&
    Math.abs(t.x - train.x) < 0.05 && Math.abs(t.y - train.y) < 0.05
  );

  const lines: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];

  return (
    <div className="absolute top-20 right-3 z-50 pointer-events-auto animate-in slide-in-from-right-4 duration-200"
      style={{ width: '260px' }}>
      <div className="rounded-xl p-4 backdrop-blur-md"
        style={{
          background: 'rgba(8, 12, 24, 0.97)',
          border: `1px solid ${lineColor}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${lineColor}15`,
        }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black"
              style={{ background: `${lineColor}25`, border: `2px solid ${lineColor}`, color: lineColor }}>
              {train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3'}
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: lineColor }}>{lineName.split(' ')[0]} {lineName.split(' ')[1]}</p>
              <p className="text-[10px]" style={{ color: 'rgba(180,190,210,0.7)' }}>
                Рівень {train.level} · {train.passengers.length}/{train.capacity} пас.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
            <X size={14} style={{ color: 'rgba(180,190,210,0.6)' }} />
          </button>
        </div>

        {/* Capacity bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${fillRatio * 100}%`,
            background: fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#f59e0b' : '#4ade80',
          }} />
        </div>

        {/* Reroute */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(180,190,210,0.5)' }}>
            <ArrowLeftRight size={10} className="inline mr-1" />Перемаршрутити
          </p>
          <div className="flex gap-1.5">
            {lines.map(l => {
              const c = METRO_LINES[l].color;
              const isCurrent = train.line === l;
              return (
                <button key={l} onClick={() => !isCurrent && onReroute(l)}
                  disabled={isCurrent}
                  className={`flex-1 py-2 rounded-md text-[12px] font-black transition-all
                    ${isCurrent ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'}`}
                  style={{
                    background: isCurrent ? `${c}10` : `${c}20`,
                    border: `1.5px solid ${isCurrent ? c + '30' : c}`,
                    color: c,
                  }}>
                  {l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions grid */}
        <div className="grid grid-cols-2 gap-1.5">
          <PanelBtn icon={<RotateCcw size={12} />} label="Розворот" onClick={onReverse} color="#94a3b8" />
          <PanelBtn icon={<ArrowUp size={12} />} label={`Апгрейд $${upgradeCost}`} onClick={onUpgrade}
            disabled={money < upgradeCost || train.level >= 3} color="#c084fc" />
          <PanelBtn icon={<Shield size={12} />} label="Щит $30" onClick={onShield}
            disabled={money < 30 || train.shieldTimer > 0}
            active={train.shieldTimer > 0} color="#38bdf8" />
          <PanelBtn icon={<DollarSign size={12} />} label="Продати +$25" onClick={onSell} color="#ef4444" />
        </div>

        {/* Merge */}
        {nearbyTrains.length > 0 && (
          <div className="mt-2">
            {nearbyTrains.map(nt => (
              <button key={nt.id} onClick={() => onMerge(nt.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all hover:brightness-125 cursor-pointer"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  color: '#a855f7',
                }}>
                <Merge size={12} />
                Об'єднати з потягом ({nt.passengers.length}/{nt.capacity})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function PanelBtn({ icon, label, onClick, disabled, active, color }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  disabled?: boolean; active?: boolean; color: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-bold transition-all
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'}
        ${active ? 'ring-1' : ''}`}
      style={{
        background: active ? `${color}20` : `${color}10`,
        borderLeft: `2px solid ${disabled ? 'transparent' : color}`,
        color,
        ringColor: active ? color : undefined,
      }}>
      {icon}
      {label}
    </button>
  );
}
