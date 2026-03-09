import React from 'react';
import { CameraMode } from '../types';
import { useIsMobile } from '@/hooks/use-mobile';

interface CameraControlsProps {
  currentMode: CameraMode;
  onSetMode: (mode: CameraMode) => void;
}

const MODES: { mode: CameraMode; label: string; key: string }[] = [
  { mode: 'free', label: 'F', key: 'Esc' },
  { mode: 'follow', label: 'T', key: 'F' },
  { mode: 'overview', label: 'O', key: 'O' },
  { mode: 'cinematic', label: 'C', key: 'C' },
];

export const CameraControls = React.memo(function CameraControls({ currentMode, onSetMode }: CameraControlsProps) {
  const isMobile = useIsMobile();
  const btnSize = isMobile ? 'w-10 h-10' : 'w-9 h-9';

  return (
    <div className={`absolute right-2 ${isMobile ? 'bottom-24' : 'bottom-16'} flex flex-col gap-1 pointer-events-auto`}>
      {MODES.map(cm => (
        <button key={cm.mode} onClick={() => onSetMode(cm.mode)}
          title={cm.key}
          className={`${btnSize} rounded-lg flex items-center justify-center text-[11px] font-black transition-all`}
          style={{
            background: currentMode === cm.mode ? 'hsl(var(--game-accent))' : 'hsl(225 45% 7% / 1)',
            border: `1px solid ${currentMode === cm.mode ? 'hsl(var(--game-accent))' : 'hsl(220 20% 16% / 1)'}`,
            color: currentMode === cm.mode ? 'hsl(var(--game-bg))' : 'hsl(220 10% 50%)',
            boxShadow: currentMode === cm.mode
              ? '0 0 12px rgba(234,179,8,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={(e) => {
            if (currentMode !== cm.mode) (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {cm.label}
        </button>
      ))}
    </div>
  );
});
