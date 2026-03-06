import React, { useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { createInitialState, handleQteInput, dispatchRepair, reverseTrain, setSpeedMultiplier, purchaseTrain, deployAntiAir, activateShield, callReinforcements, upgradeStation, evacuateStation, toggleStationOpen, upgradeTrainCapacity } from './GameEngine';
import { GameState } from './types';
import { AudioEngine } from './AudioEngine';
import { METRO_LINES, GAME_CONFIG } from './constants';
import SceneContent from './Scene3D';

// Container ref for non-passive wheel
const useWheelHandler = (stateRef: React.MutableRefObject<GameState>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      stateRef.current.camera.targetZoom = Math.max(0.3, Math.min(4, stateRef.current.camera.targetZoom * zoomDelta));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [stateRef]);
  return containerRef;
};

interface GameCanvasProps {
  onStateChange?: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onStateChange }) => {
  const stateRef = useRef<GameState>(createInitialState());
  const audioRef = useRef<AudioEngine>(new AudioEngine());
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [hudState, setHudState] = useState<GameState>(stateRef.current);
  const [showActions, setShowActions] = useState(false);

  const startGame = useCallback(() => {
    const s = { ...stateRef.current };
    s.gameStarted = true;
    stateRef.current = s;
    audioRef.current.init();
    audioRef.current.resume();
    audioRef.current.startAmbientMusic();
    setHudState({ ...s });
  }, []);

  const restartGame = useCallback(() => {
    audioRef.current.stopMusic();
    audioRef.current.stopSiren();
    stateRef.current = createInitialState();
    stateRef.current.gameStarted = true;
    audioRef.current.startAmbientMusic();
    setHudState({ ...stateRef.current });
  }, []);

  const handleStateChange = useCallback((state: GameState) => {
    setHudState({ ...state });
    onStateChange?.(state);
  }, [onStateChange]);

  const handleStationClick = useCallback((stationId: string) => {
    audioRef.current.playClick();
    const state = stateRef.current;
    const station = state.stations.find(s => s.id === stationId);
    if (station && (station.isDestroyed || station.isOnFire)) {
      stateRef.current = dispatchRepair({ ...state }, stationId);
    }
    stateRef.current = { ...stateRef.current, hoveredStation: stationId };
    setHudState({ ...stateRef.current });
  }, []);

  const handleTrainClick = useCallback((trainId: string) => {
    audioRef.current.playClick();
    stateRef.current = reverseTrain({ ...stateRef.current }, trainId);
    stateRef.current.selectedTrain = trainId;
    setHudState({ ...stateRef.current });
  }, []);

  const handleStationHover = useCallback((stationId: string | null) => {
    stateRef.current.hoveredStation = stationId;
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (state.qteActive) {
        stateRef.current = handleQteInput({ ...state }, e.key, audioRef.current);
        setHudState({ ...stateRef.current });
      }
      if (e.key === ' ') {
        e.preventDefault();
        stateRef.current = { ...stateRef.current, isPaused: !stateRef.current.isPaused };
        setHudState({ ...stateRef.current });
      }
      // Speed controls
      if (e.key === '1') { stateRef.current = setSpeedMultiplier({ ...stateRef.current }, 1); setHudState({ ...stateRef.current }); }
      if (e.key === '2') { stateRef.current = setSpeedMultiplier({ ...stateRef.current }, 2); setHudState({ ...stateRef.current }); }
      if (e.key === '3') { stateRef.current = setSpeedMultiplier({ ...stateRef.current }, 5); setHudState({ ...stateRef.current }); }
      if (e.key === '4') { stateRef.current = setSpeedMultiplier({ ...stateRef.current }, 10); setHudState({ ...stateRef.current }); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const containerRef = useWheelHandler(stateRef);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      stateRef.current.camera.targetX -= dx * 0.3;
      stateRef.current.camera.targetY -= dy * 0.3;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); }, []);

  const state = hudState;

  // Action handlers
  const handleBuyTrain = (line: 'red' | 'blue' | 'green') => {
    stateRef.current = purchaseTrain({ ...stateRef.current }, line);
    setHudState({ ...stateRef.current });
  };
  const handleDeployAA = () => {
    if (state.hoveredStation) {
      stateRef.current = deployAntiAir({ ...stateRef.current }, state.hoveredStation);
      setHudState({ ...stateRef.current });
    }
  };
  const handleShield = () => {
    if (state.hoveredStation) {
      stateRef.current = activateShield({ ...stateRef.current }, state.hoveredStation);
      setHudState({ ...stateRef.current });
    }
  };
  const handleReinforcements = () => {
    stateRef.current = callReinforcements({ ...stateRef.current });
    setHudState({ ...stateRef.current });
  };
  const handleUpgradeStation = () => {
    if (state.hoveredStation) {
      stateRef.current = upgradeStation({ ...stateRef.current }, state.hoveredStation);
      setHudState({ ...stateRef.current });
    }
  };
  const handleEvacuate = () => {
    if (state.hoveredStation) {
      stateRef.current = evacuateStation({ ...stateRef.current }, state.hoveredStation);
      setHudState({ ...stateRef.current });
    }
  };
  const handleSpeedChange = (mult: number) => {
    stateRef.current = setSpeedMultiplier({ ...stateRef.current }, mult);
    setHudState({ ...stateRef.current });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0e1a' }}
      >
        <Suspense fallback={null}>
          <SceneContent
            stateRef={stateRef}
            audioRef={audioRef}
            onStateChange={handleStateChange}
            onStationClick={handleStationClick}
            onTrainClick={handleTrainClick}
            onStationHover={handleStationHover}
          />
        </Suspense>
      </Canvas>

      {/* ===== START SCREEN ===== */}
      {!state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,14,26,0.9)' }}>
          <div className="text-center p-8 rounded-2xl max-w-lg" style={{ background: 'rgba(20,28,50,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">KYIV TRANSIT</h1>
            <p className="text-xl text-yellow-400 mb-1">RESILIENCE</p>
            <p className="text-gray-400 text-sm mb-6">Керуйте метро Києва. Перевозьте пасажирів. Захищайте місто.</p>
            <div className="text-gray-500 text-xs mb-4 space-y-1">
              <p>🖱️ Клік по потягу — змінити напрямок</p>
              <p>🖱️ Клік по пошкодженій станції — ДСНС</p>
              <p>🔲 Q/W/E/R — збити дрон (QTE)</p>
              <p>⚡ Колесо — зум | Права кнопка — камера</p>
              <p>⏸️ Пробіл — пауза | 1/2/3/4 — швидкість</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors text-lg"
            >
              ПОЧАТИ ГРУ
            </button>
          </div>
        </div>
      )}

      {/* ===== GAME OVER ===== */}
      {state.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,14,26,0.9)' }}>
          <div className="text-center p-8 rounded-2xl max-w-md" style={{ background: 'rgba(20,28,50,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-3xl font-bold text-red-500 mb-4">ГАМОВЕР</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mb-6">
              <div>Рахунок: <span className="text-white font-bold">{state.score}</span></div>
              <div>Пасажирів: <span className="text-white font-bold">{state.passengersDelivered}</span></div>
              <div>Дронів збито: <span className="text-white font-bold">{state.dronesIntercepted}</span></div>
              <div>Макс. комбо: <span className="text-white font-bold">x{state.maxCombo.toFixed(1)}</span></div>
              <div>Станцій відремонтовано: <span className="text-white font-bold">{state.stationsRepaired}</span></div>
              <div>Піковий потік: <span className="text-white font-bold">{state.peakLoad}</span></div>
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              ГРАТИ ЗНОВУ
            </button>
          </div>
        </div>
      )}

      {/* ===== HUD ===== */}
      {state.gameStarted && !state.gameOver && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-3 pointer-events-none">
            <div className="pointer-events-auto px-4 py-2 rounded-xl" style={{ background: 'rgba(15,20,40,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white font-bold text-lg">{Math.round(state.score)}</span>
                <span className="text-yellow-400">x{(Math.round(state.combo * 10) / 10).toFixed(1)}</span>
                <span className="text-green-400">💰{state.money}</span>
                <span>{'❤️'.repeat(state.lives)}{'🖤'.repeat(Math.max(0, 3 - state.lives))}</span>
              </div>
            </div>
            <div className="pointer-events-auto px-4 py-2 rounded-xl" style={{ background: 'rgba(15,20,40,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>🚇 {state.passengersDelivered}</span>
                <span>🎯 {state.dronesIntercepted}/{state.totalDrones}</span>
                <span>📊 {state.networkEfficiency}%</span>
                <span>{state.isNight ? '🌙' : '☀️'}</span>
              </div>
            </div>
          </div>

          {/* Speed control */}
          <div className="absolute top-14 left-3 pointer-events-auto flex gap-1">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${state.speedMultiplier === s
                  ? 'bg-yellow-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
                }`}
                style={state.speedMultiplier !== s ? { background: 'rgba(15,20,40,0.8)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Air Raid Banner */}
          {state.isAirRaid && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-lg animate-pulse font-bold text-sm tracking-wider">
              ⚠️ ПОВІТРЯНА ТРИВОГА ⚠️
            </div>
          )}

          {/* QTE overlay */}
          {state.qteActive && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <div className="px-8 py-4 rounded-xl animate-pulse" style={{ background: 'rgba(255,200,0,0.15)', border: '2px solid rgba(255,200,0,0.6)' }}>
                <p className="text-yellow-400 text-2xl font-bold mb-1">Натисни [{state.qteKey}]</p>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${(state.qteTimer / 2000) * 100}%` }}
                  />
                </div>
                {state.qteDroneId && (() => {
                  const drone = state.drones.find(d => d.id === state.qteDroneId);
                  return drone ? (
                    <p className="text-gray-400 text-xs mt-1">
                      {drone.droneType.toUpperCase()} • HP: {drone.hp}/{drone.maxHp}
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {state.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(10,14,26,0.6)' }}>
              <span className="text-4xl font-bold text-white">⏸ ПАУЗА</span>
            </div>
          )}

          {/* Station info tooltip */}
          {state.hoveredStation && (() => {
            const s = state.stations.find(st => st.id === state.hoveredStation);
            if (!s) return null;
            return (
              <div className="absolute bottom-20 left-4 px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(15,20,40,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-white font-bold">{s.nameUa}</p>
                <p className="text-gray-400">
                  {s.line === 'red' ? 'M1' : s.line === 'blue' ? 'M2' : 'M3'} •
                  {s.depth === 'deep' ? ' Глибока' : ' Мілка'} •
                  HP: {s.hp}/{s.maxHp} •
                  Пасажирів: {s.passengers.length}/{s.maxPassengers} •
                  Рівень: {s.level}
                  {s.isOnFire ? ' 🔥' : ''}
                  {s.isDestroyed ? ' 💀' : ''}
                  {s.isRepairing ? ` 🔧 ${Math.round(s.repairProgress * 100)}%` : ''}
                  {s.hasAntiAir ? ' 🛡️ ПРО' : ''}
                  {s.shieldTimer > 0 ? ` ⚡ ${Math.round(s.shieldTimer / 1000)}с` : ''}
                </p>
              </div>
            );
          })()}

          {/* Action bar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="flex gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(15,20,40,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Buy trains */}
              {(['red', 'blue', 'green'] as const).map(line => (
                <button
                  key={line}
                  onClick={() => handleBuyTrain(line)}
                  className="px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
                  style={{ background: METRO_LINES[line].color, color: '#fff' }}
                  disabled={state.money < GAME_CONFIG.TRAIN_COST}
                  title={`Купити потяг ${line.toUpperCase()} (${GAME_CONFIG.TRAIN_COST}💰)`}
                >
                  🚇+
                </button>
              ))}
              <div className="w-px bg-gray-600" />
              <button onClick={handleDeployAA} disabled={state.money < GAME_CONFIG.ANTI_AIR_COST || !state.hoveredStation}
                className="px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-900/30 disabled:opacity-30 transition-colors"
                style={{ border: '1px solid rgba(52,152,219,0.3)' }}
                title={`ПРО (${GAME_CONFIG.ANTI_AIR_COST}💰) — наведіть на станцію`}>
                🛡️ ПРО
              </button>
              <button onClick={handleShield} disabled={state.money < GAME_CONFIG.SHIELD_COST || !state.hoveredStation}
                className="px-2 py-1 rounded text-xs text-cyan-400 hover:bg-cyan-900/30 disabled:opacity-30 transition-colors"
                style={{ border: '1px solid rgba(0,200,200,0.3)' }}
                title={`Щит (${GAME_CONFIG.SHIELD_COST}💰) — наведіть на станцію`}>
                ⚡ Щит
              </button>
              <button onClick={handleReinforcements} disabled={state.money < GAME_CONFIG.REINFORCEMENT_COST}
                className="px-2 py-1 rounded text-xs text-orange-400 hover:bg-orange-900/30 disabled:opacity-30 transition-colors"
                style={{ border: '1px solid rgba(230,126,34,0.3)' }}
                title={`Підкріплення ДСНС (${GAME_CONFIG.REINFORCEMENT_COST}💰)`}>
                🚒 ДСНС
              </button>
              <button onClick={handleUpgradeStation} disabled={state.money < GAME_CONFIG.UPGRADE_COST || !state.hoveredStation}
                className="px-2 py-1 rounded text-xs text-green-400 hover:bg-green-900/30 disabled:opacity-30 transition-colors"
                style={{ border: '1px solid rgba(46,204,113,0.3)' }}
                title={`Апгрейд станції (${GAME_CONFIG.UPGRADE_COST}💰) — наведіть`}>
                ⬆️ Апгрейд
              </button>
              <button onClick={handleEvacuate} disabled={!state.hoveredStation}
                className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-30 transition-colors"
                style={{ border: '1px solid rgba(231,76,60,0.3)' }}
                title="Евакуація — наведіть на станцію">
                🏃 Евак
              </button>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={() => { stateRef.current.camera.targetZoom = Math.min(4, stateRef.current.camera.targetZoom * 1.3); }}
              className="w-8 h-8 rounded-lg text-white font-bold text-lg flex items-center justify-center hover:bg-white/10"
              style={{ background: 'rgba(15,20,40,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
            >+</button>
            <button
              onClick={() => { stateRef.current.camera.targetZoom = Math.max(0.3, stateRef.current.camera.targetZoom * 0.7); }}
              className="w-8 h-8 rounded-lg text-white font-bold text-lg flex items-center justify-center hover:bg-white/10"
              style={{ background: 'rgba(15,20,40,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
            >−</button>
            <button
              onClick={() => { const c = stateRef.current.camera; c.targetZoom = 1; c.targetX = 0; c.targetY = 0; }}
              className="w-8 h-8 rounded-lg text-gray-400 text-xs flex items-center justify-center hover:bg-white/10"
              style={{ background: 'rgba(15,20,40,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
            >⌂</button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameCanvas;
