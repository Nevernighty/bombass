import React from 'react';
import { METRO_LINES, GAME_CONFIG } from '../constants';

interface ActionBarProps {
  money: number;
  selectedTrain: string | null;
  selectedTrainLevel: number;
  onBuyTrain: (line: 'red' | 'blue' | 'green') => void;
  onReinforcements: () => void;
  onUpgradeTrain: () => void;
}

export const ActionBar = React.memo(function ActionBar({
  money, selectedTrain, selectedTrainLevel,
  onBuyTrain, onReinforcements, onUpgradeTrain,
}: ActionBarProps) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['red', 'blue', 'green'] as const).map(line => (
          <button
            key={line}
            onClick={() => onBuyTrain(line)}
            className="px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: METRO_LINES[line].color, color: '#fff' }}
            disabled={money < GAME_CONFIG.TRAIN_COST}
            title={`Купити потяг (${GAME_CONFIG.TRAIN_COST}💰)`}
          >
            🚇+ {GAME_CONFIG.TRAIN_COST}💰
          </button>
        ))}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <button onClick={onReinforcements} disabled={money < GAME_CONFIG.REINFORCEMENT_COST}
          className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
          style={{ color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
          🚒 ДСНС ({GAME_CONFIG.REINFORCEMENT_COST}💰)
        </button>
        {selectedTrain && (
          <button onClick={onUpgradeTrain}
            disabled={money < GAME_CONFIG.UPGRADE_COST * selectedTrainLevel}
            className="px-2 py-1 rounded text-xs disabled:opacity-30 transition-colors"
            style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
            ⬆️ Потяг
          </button>
        )}
      </div>
    </div>
  );
});
