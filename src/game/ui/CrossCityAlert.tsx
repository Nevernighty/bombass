import React from 'react';
import { CrossCityNotification } from '../types';
import { useLanguage } from '../i18n';
import { useIsMobile } from '@/hooks/use-mobile';

interface CrossCityAlertProps {
  notifications: CrossCityNotification[];
  onGoToCity: (cityId: string) => void;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  air_raid: { bg: 'hsl(0 72% 45% / 0.9)', border: 'hsl(0 72% 60%)', icon: '⚠️' },
  station_destroyed: { bg: 'hsl(0 60% 35% / 0.9)', border: 'hsl(0 60% 50%)', icon: '💥' },
  overcrowded: { bg: 'hsl(38 90% 40% / 0.9)', border: 'hsl(38 90% 55%)', icon: '📦' },
  building_destroyed: { bg: 'hsl(20 80% 40% / 0.9)', border: 'hsl(20 80% 55%)', icon: '🏚️' },
  low_stability: { bg: 'hsl(0 72% 40% / 0.9)', border: 'hsl(0 72% 55%)', icon: '🔻' },
  new_station: { bg: 'hsl(220 30% 25% / 0.9)', border: 'hsl(220 30% 40%)', icon: '🏗️' },
};

export const CrossCityAlert = React.memo(function CrossCityAlert({
  notifications, onGoToCity, onDismiss,
}: CrossCityAlertProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  if (notifications.length === 0) return null;

  const visible = notifications.slice(0, 3);

  // Mobile: bottom-center above ActionBar. Desktop: top-right.
  const wrapClass = isMobile
    ? 'fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 pointer-events-auto z-30'
    : 'absolute top-16 right-3 flex flex-col gap-1.5 pointer-events-auto z-30';

  return (
    <div className={wrapClass} style={{ maxWidth: isMobile ? '90vw' : 280 }}>
      {visible.map((notif, i) => {
        const style = TYPE_STYLES[notif.type] || TYPE_STYLES.air_raid;
        return (
          <div key={notif.id}
            className="rounded-xl px-3 py-2 flex items-center gap-2 animate-in slide-in-from-right-4 duration-200"
            style={{
              background: style.bg,
              borderLeft: `3px solid ${style.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              animationDelay: `${i * 100}ms`,
            }}>
            <span className="text-sm">{notif.cityIcon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black block leading-tight" style={{ color: '#fff' }}>
                {notif.cityName}
              </span>
              <span className="text-[9px] block leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {notif.text}
              </span>
            </div>
            <button onClick={() => onGoToCity(notif.cityId)}
              className="text-[9px] font-black px-2 py-1 rounded-md transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
              {t('crosscity.go')}
            </button>
          </div>
        );
      })}
    </div>
  );
});
