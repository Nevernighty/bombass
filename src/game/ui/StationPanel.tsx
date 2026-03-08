import React, { useState, useRef, useCallback } from 'react';
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

interface BtnTooltip {
  name: string;
  desc: string;
}

const BTN_TOOLTIPS: Record<string, BtnTooltip> = {
  'Зенітка': { name: 'Протиповітряна оборона', desc: 'Автоматично збиває дрони поблизу станції' },
  'Ракетний комплекс': { name: 'Зенітний ракетний комплекс', desc: 'Потужна ракетна система великого радіуса дії' },
  'Турель': { name: 'Зенітна турель', desc: 'Автоматична кулеметна установка проти дронів' },
  'Перехоплювач': { name: 'Ракета-перехоплювач', desc: 'Одноразова ракета знищує найближчий дрон' },
  'Щит': { name: 'Захисний щит', desc: 'Тимчасовий бар\'єр поглинає весь вхідний урон' },
  'Укріплення': { name: 'Фортифікація', desc: 'Зменшує отриманий урон на 50% назавжди' },
  'EMP імпульс': { name: 'Електромагнітний імпульс', desc: 'Вимикає всі дрони поблизу на кілька секунд' },
  'Покращити': { name: 'Покращити станцію', desc: 'Збільшує місткість, дохід та міцність' },
  'Евакуація': { name: 'Евакуювати пасажирів', desc: 'Перемістити всіх пасажирів на сусідні станції' },
  'Тунель': { name: 'Герметизація тунелю', desc: 'Тимчасово закрити тунелі для захисту від затоплення' },
  'Прискорення': { name: 'Прискорення потягів', desc: 'Тимчасово збільшити швидкість руху потягів' },
  'Експрес': { name: 'Експрес-лінія', desc: 'Запустити швидкий маршрут без зупинок' },
  'Магніт': { name: 'Магніт пасажирів', desc: 'Притягнути пасажирів із сусідніх станцій' },
  'Закрити': { name: 'Закрити станцію', desc: 'Припинити прийом пасажирів' },
  'Відкрити': { name: 'Відкрити станцію', desc: 'Відновити прийом пасажирів' },
  'Сховок': { name: 'Режим укриття', desc: 'Використати глибоку станцію як бомбосховище' },
  'Вийти': { name: 'Вийти з укриття', desc: 'Повернути станцію у звичайний режим' },
};

function PanelBtn({ onClick, disabled, children, cost, insufficientMoney, label }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  cost?: number;
  insufficientMoney?: boolean;
  label?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout>>();
  const tip = label ? BTN_TOOLTIPS[label] : null;

  const handleEnter = useCallback(() => {
    tipTimer.current = setTimeout(() => setShowTip(true), 250);
  }, []);
  const handleLeave = useCallback(() => {
    clearTimeout(tipTimer.current);
    setShowTip(false);
  }, []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button onClick={onClick} disabled={disabled}
        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-all
          disabled:opacity-25 hover:brightness-125"
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

      {showTip && tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none z-50 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
          style={{ width: '190px' }}>
          <div className="game-panel rounded-lg px-3 py-2 text-left">
            <p className="text-[11px] font-bold mb-0.5" style={{ color: 'hsl(var(--foreground))' }}>{tip.name}</p>
            <p className="text-[10px] leading-snug" style={{ color: 'hsl(var(--muted-foreground))' }}>{tip.desc}</p>
            {cost !== undefined && (
              <p className="text-[10px] font-mono mt-1" style={{ color: 'hsl(145, 63%, 49%)' }}>${cost}</p>
            )}
          </div>
        </div>
      )}
    </div>
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
    <div className="absolute bottom-20 left-3 px-4 py-3 rounded-lg text-xs pointer-events-auto w-80 animate-slide-in-left game-panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full" style={{ background: lineColor }} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{station.nameUa}</p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {lineName} · {station.depth === 'deep' ? 'Глибока' : 'Мілка'} · Рів.{station.level}
              {station.isFortified ? ' · Укріплена' : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/50 transition-colors">
          <X size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </button>
      </div>

      {/* HP bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hpPct}%`, background: hpColor }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color: hpColor }}>{station.hp}/{station.maxHp}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <span>{station.passengers.length}/{station.maxPassengers} пасажирів</span>
        <span>${station.stationIncome}/доставка</span>
        {station.hasAntiAir && <span style={{ color: 'hsl(204, 70%, 53%)' }}>Зенітка</span>}
        {station.hasSAM && <span style={{ color: 'hsl(145, 63%, 49%)' }}>ЗРК</span>}
        {station.hasAATurret && <span style={{ color: 'hsl(var(--game-accent))' }}>Турель</span>}
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
      <p className="text-[9px] mb-1.5 font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>Оборона</p>
      <div className="grid grid-cols-2 gap-1 mb-3">
        <PanelBtn onClick={onDeployAA} disabled={money < GAME_CONFIG.ANTI_AIR_COST || station.hasAntiAir}
          insufficientMoney={money < GAME_CONFIG.ANTI_AIR_COST} cost={GAME_CONFIG.ANTI_AIR_COST} label="Зенітка">
          Зенітка
        </PanelBtn>
        <PanelBtn onClick={onBuySAM} disabled={money < GAME_CONFIG.SAM_BATTERY_COST || station.hasSAM}
          insufficientMoney={money < GAME_CONFIG.SAM_BATTERY_COST} cost={GAME_CONFIG.SAM_BATTERY_COST} label="Ракетний комплекс">
          Ракетний комплекс
        </PanelBtn>
        <PanelBtn onClick={onBuyAATurret} disabled={money < GAME_CONFIG.AA_TURRET_COST || station.hasAATurret}
          insufficientMoney={money < GAME_CONFIG.AA_TURRET_COST} cost={GAME_CONFIG.AA_TURRET_COST} label="Турель">
          Турель
        </PanelBtn>
        <PanelBtn onClick={onLaunchInterceptor} disabled={money < GAME_CONFIG.INTERCEPTOR_COST}
          insufficientMoney={money < GAME_CONFIG.INTERCEPTOR_COST} cost={GAME_CONFIG.INTERCEPTOR_COST} label="Перехоплювач">
          Перехоплювач
        </PanelBtn>
        <PanelBtn onClick={onShield} disabled={money < GAME_CONFIG.SHIELD_COST || station.shieldTimer > 0}
          insufficientMoney={money < GAME_CONFIG.SHIELD_COST} cost={GAME_CONFIG.SHIELD_COST} label="Щит">
          Щит
        </PanelBtn>
        <PanelBtn onClick={onFortify} disabled={money < 100 || station.isFortified}
          insufficientMoney={money < 100} cost={100} label="Укріплення">
          Укріплення
        </PanelBtn>
        <PanelBtn onClick={onEMP} disabled={money < 60 || station.empCooldown > 0}
          insufficientMoney={money < 60} cost={60} label="EMP імпульс">
          EMP імпульс
        </PanelBtn>
      </div>

      {/* Separator */}
      <div className="h-px w-full mb-3" style={{ background: 'hsl(var(--border))' }} />

      {/* Station actions */}
      <p className="text-[9px] mb-1.5 font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>Управління</p>
      <div className="grid grid-cols-2 gap-1">
        <PanelBtn onClick={onUpgrade} disabled={money < GAME_CONFIG.UPGRADE_COST * station.level || station.level >= 3}
          insufficientMoney={money < GAME_CONFIG.UPGRADE_COST * station.level} cost={GAME_CONFIG.UPGRADE_COST * station.level} label="Покращити">
          Покращити
        </PanelBtn>
        <PanelBtn onClick={onEvacuate} disabled={station.passengers.length === 0} label="Евакуація">
          Евакуація
        </PanelBtn>
        <PanelBtn onClick={onToggle} label={station.isOpen ? 'Закрити' : 'Відкрити'}>
          {station.isOpen ? 'Закрити станцію' : 'Відкрити станцію'}
        </PanelBtn>
        {station.depth === 'deep' && isAirRaid && (
          <PanelBtn onClick={onShelter} label={station.isSheltering ? 'Вийти' : 'Сховок'}>
            {station.isSheltering ? 'Вийти з укриття' : 'Режим укриття'}
          </PanelBtn>
        )}
        <PanelBtn onClick={onSealTunnel} disabled={money < GAME_CONFIG.TUNNEL_SEAL_COST || station.tunnelSealTimer > 0}
          insufficientMoney={money < GAME_CONFIG.TUNNEL_SEAL_COST} cost={GAME_CONFIG.TUNNEL_SEAL_COST} label="Тунель">
          Герметизація тунелю
        </PanelBtn>
        <PanelBtn onClick={onSpeedBoost} disabled={money < GAME_CONFIG.SPEED_BOOST_COST || speedBoostCooldown > 0}
          insufficientMoney={money < GAME_CONFIG.SPEED_BOOST_COST} cost={GAME_CONFIG.SPEED_BOOST_COST} label="Прискорення">
          Прискорення
        </PanelBtn>
        <PanelBtn onClick={onExpressLine} disabled={money < GAME_CONFIG.EXPRESS_LINE_COST}
          insufficientMoney={money < GAME_CONFIG.EXPRESS_LINE_COST} cost={GAME_CONFIG.EXPRESS_LINE_COST} label="Експрес">
          Експрес-лінія
        </PanelBtn>
        <PanelBtn onClick={onStationMagnet} disabled={money < GAME_CONFIG.STATION_MAGNET_COST || stationMagnetTimer > 0}
          insufficientMoney={money < GAME_CONFIG.STATION_MAGNET_COST} cost={GAME_CONFIG.STATION_MAGNET_COST} label="Магніт">
          Магніт пасажирів
        </PanelBtn>
      </div>
    </div>
  );
});
