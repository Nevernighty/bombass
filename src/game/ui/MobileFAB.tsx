import React, { useState, useCallback } from 'react';
import {
  Train, Shield, DollarSign, AlertTriangle, Radar, Target, Zap,
  Users, Wrench, Moon, Gauge, Crosshair, RotateCcw, Lock, Unlock,
  Package, Rocket, X
} from 'lucide-react';
import { METRO_LINES, GAME_CONFIG } from '../constants';

type Category = 'trains' | 'defense' | 'economy' | 'emergency' | null;

interface MobileFABProps {
  money: number;
  radarActive: boolean;
  doubleFareTimer: number;
  expressTimer: number;
  blackoutMode: boolean;
  signalFlareTimer: number;
  droneJammerTimer: number;
  emergencyBrakeTimer: number;
  lives: number;
  closedSegments: { line: string; from: string; to: string; timer: number }[];
  onBuyTrain: (line: string) => void;
  onReinforcements: () => void;
  onBuyGenerator: () => void;
  onBuyRadar: () => void;
  onPlaceDecoy: () => void;
  onEmergencyBrake: () => void;
  onDoubleFare: () => void;
  onBlackout: () => void;
  onSignalFlare: () => void;
  onPassengerAirdrop: () => void;
  onDroneJammer: () => void;
  onEmergencyFund: () => void;
  onCloseSegment: (line: string) => void;
  onReopenLine: (line: string) => void;
}

interface MobileActionBtnProps {
  icon: React.ReactNode;
  label: string;
  cost?: number;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color: string;
}

function MobileActionBtn({ icon, label, cost, onClick, disabled, active, color }: MobileActionBtnProps) {
  const insufficient = cost !== undefined && disabled;
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-90"
      style={{
        width: '100%',
        aspectRatio: '1',
        minHeight: '56px',
        background: active ? `color-mix(in srgb, ${color} 15%, hsl(225 45% 7%))` : 'hsl(225 40% 8%)',
        border: `2px solid ${active ? color : 'hsl(220 20% 16%)'}`,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      <span style={{ color: disabled ? 'hsl(220 10% 30%)' : color }}>{icon}</span>
      <span className="text-[9px] font-bold leading-tight text-center" style={{ color: '#d0d8e8' }}>{label}</span>
      {cost !== undefined && (
        <span className="text-[8px] font-black" style={{
          color: insufficient ? '#ef4444' : '#4ade80',
        }}>${cost}</span>
      )}
    </button>
  );
}

export const MobileFAB = React.memo(function MobileFAB({
  money, radarActive, doubleFareTimer, expressTimer, blackoutMode,
  signalFlareTimer, droneJammerTimer, emergencyBrakeTimer, lives,
  closedSegments,
  onBuyTrain, onReinforcements, onBuyGenerator, onBuyRadar, onPlaceDecoy,
  onEmergencyBrake, onDoubleFare, onBlackout, onSignalFlare,
  onPassengerAirdrop, onDroneJammer, onEmergencyFund,
  onCloseSegment, onReopenLine,
}: MobileFABProps) {
  const [open, setOpen] = useState<Category>(null);

  const toggle = useCallback((cat: Category) => {
    setOpen(prev => prev === cat ? null : cat);
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const categories: { id: Category; icon: React.ReactNode; label: string; color: string }[] = [
    { id: 'trains', icon: <Train size={18} />, label: 'Потяги', color: '#e53935' },
    { id: 'defense', icon: <Shield size={18} />, label: 'Оборона', color: '#38bdf8' },
    { id: 'economy', icon: <DollarSign size={18} />, label: 'Економіка', color: '#4ade80' },
    { id: 'emergency', icon: <AlertTriangle size={18} />, label: 'Аварійне', color: '#ef4444' },
  ];

  const lines: string[] = ['red', 'blue', 'green'];

  return (
    <>
      {/* Bottom sheet backdrop */}
      {open && (
        <div className="absolute inset-0 z-40" onClick={close} style={{
          background: 'rgba(0,0,0,0.4)',
        }} />
      )}

      {/* Bottom sheet content */}
      {open && (
        <div className="absolute bottom-20 left-0 right-0 z-50 pointer-events-auto px-3 pb-2"
          style={{ animation: 'slide-up-fade 0.2s ease-out' }}>
          <div className="rounded-2xl p-4 max-h-[50vh] overflow-y-auto" style={{
            background: 'hsl(225 45% 5% / 0.98)',
            border: '1px solid hsl(220 20% 14%)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
          }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider" style={{
                color: categories.find(c => c.id === open)?.color || '#fff',
              }}>
                {categories.find(c => c.id === open)?.label}
              </span>
              <button onClick={close} className="p-1 rounded cursor-pointer" style={{ color: '#7a8599' }}>
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {open === 'trains' && lines.map(l => {
                const c = METRO_LINES[l].color;
                const label = l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3';
                return (
                  <MobileActionBtn key={l} icon={<Train size={20} />} label={label}
                    cost={GAME_CONFIG.TRAIN_COST} onClick={() => { onBuyTrain(l); close(); }}
                    disabled={money < GAME_CONFIG.TRAIN_COST} color={c} />
                );
              })}

              {open === 'defense' && (
                <>
                  <MobileActionBtn icon={<Radar size={20} />} label="Радар" cost={GAME_CONFIG.RADAR_COST}
                    onClick={() => { onBuyRadar(); close(); }}
                    disabled={money < GAME_CONFIG.RADAR_COST || radarActive} active={radarActive} color="#38bdf8" />
                  <MobileActionBtn icon={<Target size={20} />} label="Приманка" cost={GAME_CONFIG.DECOY_COST}
                    onClick={() => { onPlaceDecoy(); close(); }}
                    disabled={money < GAME_CONFIG.DECOY_COST} color="#facc15" />
                  <MobileActionBtn icon={<Crosshair size={20} />} label="Глушилка" cost={GAME_CONFIG.DRONE_JAMMER_COST}
                    onClick={() => { onDroneJammer(); close(); }}
                    disabled={money < GAME_CONFIG.DRONE_JAMMER_COST || droneJammerTimer > 0} color="#38bdf8" />
                  <MobileActionBtn icon={<Zap size={20} />} label="Ракета" cost={GAME_CONFIG.SIGNAL_FLARE_COST}
                    onClick={() => { onSignalFlare(); close(); }}
                    disabled={money < GAME_CONFIG.SIGNAL_FLARE_COST || signalFlareTimer > 0} color="#facc15" />
                </>
              )}

              {open === 'economy' && (
                <>
                  <MobileActionBtn icon={<DollarSign size={20} />} label="x2 Тариф" cost={GAME_CONFIG.DOUBLE_FARE_COST}
                    onClick={() => { onDoubleFare(); close(); }}
                    disabled={money < GAME_CONFIG.DOUBLE_FARE_COST || doubleFareTimer > 0}
                    active={doubleFareTimer > 0} color="#4ade80" />
                  <MobileActionBtn icon={<Users size={20} />} label="Десант" cost={GAME_CONFIG.PASSENGER_AIRDROP_COST}
                    onClick={() => { onPassengerAirdrop(); close(); }}
                    disabled={money < GAME_CONFIG.PASSENGER_AIRDROP_COST} color="#c084fc" />
                  <MobileActionBtn icon={<AlertTriangle size={20} />} label="Фонд"
                    onClick={() => { onEmergencyFund(); close(); }}
                    disabled={lives <= 1} color="#ef4444" />
                </>
              )}

              {open === 'emergency' && (
                <>
                  <MobileActionBtn icon={<RotateCcw size={20} />} label="Стоп" cost={GAME_CONFIG.EMERGENCY_BRAKE_COST}
                    onClick={() => { onEmergencyBrake(); close(); }}
                    disabled={money < GAME_CONFIG.EMERGENCY_BRAKE_COST || emergencyBrakeTimer > 0} color="#ef4444" />
                  <MobileActionBtn icon={<Moon size={20} />} label="Блекаут"
                    onClick={() => { onBlackout(); close(); }}
                    active={blackoutMode} color="#94a3b8" />
                  <MobileActionBtn icon={<Wrench size={20} />} label="Ремонт" cost={GAME_CONFIG.REINFORCEMENT_COST}
                    onClick={() => { onReinforcements(); close(); }}
                    disabled={money < GAME_CONFIG.REINFORCEMENT_COST} color="#fb923c" />
                  <MobileActionBtn icon={<Gauge size={20} />} label="Генератор" cost={GAME_CONFIG.GENERATOR_COST}
                    onClick={() => { onBuyGenerator(); close(); }}
                    disabled={money < GAME_CONFIG.GENERATOR_COST} color="#4ade80" />
                  {lines.map(l => {
                    const c = METRO_LINES[l].color;
                    const isClosed = closedSegments.some(s => s.line === l);
                    const lineLabel = l === 'red' ? 'M1' : l === 'blue' ? 'M2' : 'M3';
                    return (
                      <MobileActionBtn key={l}
                        icon={isClosed ? <Unlock size={18} /> : <Lock size={18} />}
                        label={isClosed ? `Відкр ${lineLabel}` : `Закр ${lineLabel}`}
                        cost={isClosed ? undefined : 15}
                        onClick={() => { isClosed ? onReopenLine(l) : onCloseSegment(l); close(); }}
                        disabled={!isClosed && money < 15}
                        active={isClosed} color={c} />
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category bar */}
      <div className="absolute bottom-2 left-2 right-2 z-50 pointer-events-auto">
        <div className="flex items-center justify-around gap-1.5 px-2 py-1.5 rounded-2xl" style={{
          background: 'hsl(225 45% 5% / 0.98)',
          border: '1px solid hsl(220 20% 14%)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
        }}>
          {categories.map(cat => {
            const isActive = open === cat.id;
            return (
              <button key={cat.id!} onClick={() => toggle(cat.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-90"
                style={{
                  background: isActive ? `color-mix(in srgb, ${cat.color} 15%, transparent)` : 'transparent',
                  color: isActive ? cat.color : 'hsl(220 10% 45%)',
                }}>
                {cat.icon}
                <span className="text-[8px] font-bold">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
});
