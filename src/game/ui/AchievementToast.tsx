import React, { useEffect, useState } from 'react';
import { Achievement } from '../types';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className="absolute top-20 right-4 pointer-events-none z-50 transition-all duration-400"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="px-4 py-3 rounded-lg flex items-center gap-3" style={{
        background: 'rgba(15,22,42,0.95)',
        border: '2px solid #eab308',
        boxShadow: '0 0 20px rgba(234,179,8,0.3)',
        backdropFilter: 'blur(12px)',
      }}>
        <span className="text-2xl">{achievement.icon}</span>
        <div>
          <p className="text-xs font-bold" style={{ color: '#eab308' }}>🏆 ДОСЯГНЕННЯ</p>
          <p className="text-sm text-white font-bold">{achievement.nameUa}</p>
        </div>
      </div>
    </div>
  );
};
