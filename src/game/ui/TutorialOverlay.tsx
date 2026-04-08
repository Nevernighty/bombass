import React, { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface TutorialStep {
  textUa: string;
  highlightId?: string;
  position?: 'center' | 'top' | 'bottom';
}

const STEPS: TutorialStep[] = [
  { textUa: 'Ласкаво просимо! Керуй транспортом міста під ворожими атаками.', position: 'center' },
  { textUa: 'Тягни камеру для огляду — мишкою або пальцем на мобільному', position: 'center' },
  { textUa: 'Натисни на станцію щоб побачити її статус і дії', position: 'bottom' },
  { textUa: 'Купи потяг внизу екрану — обери лінію M1, M2 або M3', position: 'bottom' },
  { textUa: 'Сірі станції чекають підключення — клікни кінцеву станцію і тягни до неї', position: 'center' },
  { textUa: 'Побудуй оборону — зенітка, щит та ЗРК захистять станції', position: 'bottom' },
  { textUa: 'Виживи під атакою дронів! Удачі, командире! 🇺🇦', position: 'center' },
];

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ step, onNext, onSkip }: TutorialOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 300);
    return () => clearTimeout(t);
  }, [step]);

  if (!visible || step >= STEPS.length) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const posClass = currentStep.position === 'bottom' ? 'bottom-24' : currentStep.position === 'top' ? 'top-20' : 'top-1/2 -translate-y-1/2';

  return (
    <>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 z-[200] pointer-events-auto" style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Tutorial card */}
        <div className={`absolute left-1/2 -translate-x-1/2 ${posClass} z-[201] max-w-sm w-[90%]`}
          style={{
            animation: animating ? 'mode-card-in 0.3s ease-out' : undefined,
          }}>
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{
            background: 'hsl(225 45% 6% / 0.98)',
            border: '1px solid hsl(var(--game-accent) / 0.3)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 30px rgba(234,179,8,0.1)',
          }}>
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--game-accent)), transparent)',
            }} />

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-3">
              {STEPS.map((_, i) => (
                <div key={i} className="h-1 rounded-full transition-all duration-300" style={{
                  width: i === step ? '20px' : '8px',
                  background: i <= step ? 'hsl(var(--game-accent))' : 'hsl(220 20% 20%)',
                }} />
              ))}
            </div>

            {/* Bouncing arrow */}
            {(step >= 2 && step <= 5) && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2" style={{
                animation: 'tutorial-bounce 1s ease-in-out infinite',
              }}>
                <div className="w-0 h-0" style={{
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '12px solid hsl(var(--game-accent))',
                }} />
              </div>
            )}

            <p className="text-sm font-bold leading-relaxed mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              {currentStep.textUa}
            </p>

            <div className="flex items-center justify-between">
              <button onClick={onSkip}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  color: 'hsl(var(--game-muted))',
                  background: 'hsl(220 25% 12%)',
                }}>
                Пропустити
              </button>

              <button onClick={isLast ? onSkip : onNext}
                className="flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-lg transition-all cursor-pointer game-btn-hover"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--game-accent)), hsl(45 85% 45%))',
                  color: 'hsl(var(--game-bg))',
                  boxShadow: '0 4px 12px rgba(234,179,8,0.3)',
                }}>
                {isLast ? 'Почати гру!' : 'Далі'}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
