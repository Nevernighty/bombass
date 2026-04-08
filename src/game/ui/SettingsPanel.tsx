import React from 'react';
import { X, Volume2, Music, Vibrate, RotateCcw } from 'lucide-react';

interface SettingsPanelProps {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  isMobile: boolean;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onToggleVibration: () => void;
  onRestart: () => void;
  onClose: () => void;
}

function ToggleRow({ icon, label, enabled, onToggle }: {
  icon: React.ReactNode; label: string; enabled: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1">
      <div className="flex items-center gap-2.5">
        <span style={{ color: enabled ? 'hsl(var(--game-accent))' : 'hsl(var(--game-muted))' }}>{icon}</span>
        <span className="text-xs font-bold" style={{ color: 'hsl(var(--foreground))' }}>{label}</span>
      </div>
      <button onClick={onToggle} className="relative w-10 h-5 rounded-full transition-all cursor-pointer"
        style={{
          background: enabled ? 'hsl(var(--game-accent) / 0.3)' : 'hsl(220 20% 15%)',
          border: `1px solid ${enabled ? 'hsl(var(--game-accent) / 0.5)' : 'hsl(220 20% 22%)'}`,
        }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
          left: enabled ? '20px' : '2px',
          background: enabled ? 'hsl(var(--game-accent))' : 'hsl(220 15% 35%)',
          boxShadow: enabled ? '0 0 8px rgba(234,179,8,0.4)' : 'none',
        }} />
      </button>
    </div>
  );
}

export const SettingsPanel = React.memo(function SettingsPanel({
  sfxEnabled, musicEnabled, vibrationEnabled, isMobile,
  onToggleSfx, onToggleMusic, onToggleVibration, onRestart, onClose,
}: SettingsPanelProps) {
  return (
    <div className="absolute top-16 right-3 z-50 pointer-events-auto animate-in slide-in-from-right-4 duration-200"
      style={{ width: isMobile ? '85vw' : '220px', maxWidth: '280px' }}>
      <div className="rounded-xl overflow-hidden" style={{
        background: 'hsl(225 45% 6% / 0.98)',
        border: '1px solid hsl(220 20% 16%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
      }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'hsl(var(--game-accent))' }}>
            Налаштування
          </span>
          <button onClick={onClose} className="p-1 rounded cursor-pointer" style={{ color: 'hsl(var(--game-muted))' }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 pb-3" style={{ borderBottom: '1px solid hsl(220 20% 14%)' }}>
          <ToggleRow icon={<Volume2 size={14} />} label="Звукові ефекти" enabled={sfxEnabled} onToggle={onToggleSfx} />
          <ToggleRow icon={<Music size={14} />} label="Музика" enabled={musicEnabled} onToggle={onToggleMusic} />
          {isMobile && (
            <ToggleRow icon={<Vibrate size={14} />} label="Вібрація" enabled={vibrationEnabled} onToggle={onToggleVibration} />
          )}
        </div>

        <div className="px-4 py-3">
          <button onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer game-btn-hover"
            style={{
              background: 'hsl(0 72% 51% / 0.15)',
              border: '1px solid hsl(0 72% 51% / 0.3)',
              color: 'hsl(0 72% 65%)',
            }}>
            <RotateCcw size={12} />
            Перезапустити гру
          </button>
        </div>
      </div>
    </div>
  );
});
