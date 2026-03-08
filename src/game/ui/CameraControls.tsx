import React from 'react';
import { CameraMode } from '../types';

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
  return (
    <div className="absolute right-2 bottom-16 flex gap-1 pointer-events-auto">
      {MODES.map(cm => (
        <button key={cm.mode} onClick={() => onSetMode(cm.mode)}
          title={`${cm.key}`}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold transition-all"
          style={{
            background: currentMode === cm.mode ? 'hsla(var(--game-accent), 0.15)' : 'hsla(var(--game-glass), 0.85)',
            border: `1px solid ${currentMode === cm.mode ? 'hsla(var(--game-accent), 0.4)' : 'hsl(var(--border))'}`,
            color: currentMode === cm.mode ? 'hsl(var(--game-accent))' : 'hsl(var(--muted-foreground))',
            backdropFilter: 'blur(8px)',
          }}>
          {cm.label}
        </button>
      ))}
    </div>
  );
});
