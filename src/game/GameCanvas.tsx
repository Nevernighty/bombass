import React, { useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { createInitialState, handleQteInput, dispatchRepair, reverseTrain, setSpeedMultiplier, purchaseTrain, deployAntiAir, activateShield, callReinforcements, upgradeStation, evacuateStation, toggleStationOpen, upgradeTrainCapacity, attackDrone, globalEventBus } from './GameEngine';
import { GameState } from './types';
import { AudioEngine } from './AudioEngine';
import { GAME_CONFIG } from './constants';
import SceneContent from './Scene3D';
import { TopBar } from './ui/TopBar';
import { StationPanel } from './ui/StationPanel';
import { ActionBar } from './ui/ActionBar';
import { AudioFeedback } from './core/AudioFeedback';

const useWheelHandler = (stateRef: React.MutableRefObject<GameState>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
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
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const audioFeedbackRef = useRef<AudioFeedback | null>(null);

  const startGame = useCallback(() => {
    const s = { ...stateRef.current };
    s.gameStarted = true;
    stateRef.current = s;
    audioRef.current.init();
    audioRef.current.resume();
    audioRef.current.startAmbientMusic();
    // Wire up EventBus → Audio
    if (!audioFeedbackRef.current) {
      audioFeedbackRef.current = new AudioFeedback(audioRef.current, globalEventBus);
    }
    setHudState({ ...s });
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
    setSelectedStation(stationId);
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

  const handleDroneClick = useCallback((droneId: string) => {
    audioRef.current.playClick();
    stateRef.current = attackDrone({ ...stateRef.current }, droneId);
    setHudState({ ...stateRef.current });
  }, []);

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
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const zoom = stateRef.current.camera.zoom;
      const panSpeed = 0.12 / Math.max(zoom, 0.5);
      stateRef.current.camera.targetX -= dx * panSpeed;
      stateRef.current.camera.targetY -= dy * panSpeed;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); }, []);

  // Touch support
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
    }
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      const zoom = stateRef.current.camera.zoom;
      const panSpeed = 0.12 / Math.max(zoom, 0.5);
      stateRef.current.camera.targetX -= dx * panSpeed;
      stateRef.current.camera.targetY -= dy * panSpeed;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (touchStartRef.current.dist > 0) {
        const scale = dist / touchStartRef.current.dist;
        stateRef.current.camera.targetZoom = Math.max(0.3, Math.min(4, stateRef.current.camera.targetZoom * scale));
      }
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist,
      };
    }
  }, []);
  const handleTouchEnd = useCallback(() => { touchStartRef.current = null; }, []);

  const state = hudState;

  // Memoized handlers
  const handleBuyTrain = useCallback((line: 'red' | 'blue' | 'green') => {
    stateRef.current = purchaseTrain({ ...stateRef.current }, line);
    setHudState({ ...stateRef.current });
  }, []);
  const handleDeployAA = useCallback(() => {
    const sid = selectedStation || state.hoveredStation;
    if (sid) { stateRef.current = deployAntiAir({ ...stateRef.current }, sid); setHudState({ ...stateRef.current }); }
  }, [selectedStation, state.hoveredStation]);
  const handleShield = useCallback(() => {
    const sid = selectedStation || state.hoveredStation;
    if (sid) { stateRef.current = activateShield({ ...stateRef.current }, sid); setHudState({ ...stateRef.current }); }
  }, [selectedStation, state.hoveredStation]);
  const handleReinforcements = useCallback(() => {
    stateRef.current = callReinforcements({ ...stateRef.current });
    setHudState({ ...stateRef.current });
  }, []);
  const handleUpgradeStation = useCallback(() => {
    const sid = selectedStation || state.hoveredStation;
    if (sid) { stateRef.current = upgradeStation({ ...stateRef.current }, sid); setHudState({ ...stateRef.current }); }
  }, [selectedStation, state.hoveredStation]);
  const handleEvacuate = useCallback(() => {
    const sid = selectedStation || state.hoveredStation;
    if (sid) { stateRef.current = evacuateStation({ ...stateRef.current }, sid); setHudState({ ...stateRef.current }); }
  }, [selectedStation, state.hoveredStation]);
  const handleToggleStation = useCallback(() => {
    const sid = selectedStation || state.hoveredStation;
    if (sid) { stateRef.current = toggleStationOpen({ ...stateRef.current }, sid); setHudState({ ...stateRef.current }); }
  }, [selectedStation, state.hoveredStation]);
  const handleUpgradeTrain = useCallback(() => {
    if (state.selectedTrain) {
      stateRef.current = upgradeTrainCapacity({ ...stateRef.current }, state.selectedTrain);
      setHudState({ ...stateRef.current });
    }
  }, [state.selectedTrain]);
  const handleSpeedChange = useCallback((mult: number) => {
    stateRef.current = setSpeedMultiplier({ ...stateRef.current }, mult);
    setHudState({ ...stateRef.current });
  }, []);

  const selStation = selectedStation ? state.stations.find(s => s.id === selectedStation) : null;
  const selectedTrainLevel = state.selectedTrain ? (state.trains.find(t => t.id === state.selectedTrain)?.level || 1) : 1;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas shadows gl={{ antialias: true, alpha: false }} style={{ background: '#060a14' }}>
        <Suspense fallback={null}>
          <SceneContent
            stateRef={stateRef}
            audioRef={audioRef}
            onStateChange={handleStateChange}
            onStationClick={handleStationClick}
            onTrainClick={handleTrainClick}
            onStationHover={handleStationHover}
            onDroneClick={handleDroneClick}
          />
        </Suspense>
      </Canvas>

      {/* START SCREEN */}
      {!state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,10,20,0.94)' }}>
          <div className="text-center p-8 rounded-2xl max-w-lg" style={{ background: 'rgba(15,22,42,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'monospace' }}>KYIV TRANSIT</h1>
            <p className="text-xl mb-1" style={{ color: '#eab308' }}>RESILIENCE</p>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Керуйте метро Києва. Перевозьте пасажирів. Захищайте місто.</p>
            <div className="text-xs mb-4 space-y-1" style={{ color: '#6b7280' }}>
              <p>🖱️ Перетягуйте — камера | Колесо — зум</p>
              <p>🚇 Клік по потягу — змінити напрямок</p>
              <p>🏗️ Клік по станції — управління</p>
              <p>⚡ Q/W/E/R — збити дрон | ⏸️ Пробіл — пауза</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 font-bold rounded-lg text-lg transition-all hover:scale-105"
              style={{ background: '#eab308', color: '#1a1a2e' }}
            >
              ПОЧАТИ ГРУ
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {state.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,10,20,0.92)' }}>
          <div className="text-center p-8 rounded-2xl max-w-md" style={{ background: 'rgba(15,22,42,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#ef4444' }}>ГАМОВЕР</h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-6" style={{ color: '#9ca3af' }}>
              <div>Рахунок: <span className="text-white font-bold">{state.score}</span></div>
              <div>Час: <span className="text-white font-bold">{Math.floor(state.elapsedTime / 60000)}:{String(Math.floor((state.elapsedTime % 60000) / 1000)).padStart(2, '0')}</span></div>
              <div>Пасажирів: <span className="text-white font-bold">{state.passengersDelivered}</span></div>
              <div>Дронів збито: <span className="text-white font-bold">{state.dronesIntercepted}/{state.totalDrones}</span></div>
              <div>Макс. комбо: <span className="text-white font-bold">x{state.maxCombo.toFixed(1)}</span></div>
              <div>Станцій втрачено: <span className="text-white font-bold">{state.stationsDestroyed}</span></div>
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-3 font-bold rounded-lg transition-all hover:scale-105"
              style={{ background: '#eab308', color: '#1a1a2e' }}
            >
              ГРАТИ ЗНОВУ
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {state.gameStarted && !state.gameOver && (
        <>
          <TopBar
            score={state.score}
            combo={state.combo}
            money={state.money}
            lives={state.lives}
            speedMultiplier={state.speedMultiplier}
            elapsedTime={state.elapsedTime}
            passengersDelivered={state.passengersDelivered}
            dronesIntercepted={state.dronesIntercepted}
            totalDrones={state.totalDrones}
            networkEfficiency={state.networkEfficiency}
            isNight={state.isNight}
            waveIndex={state.waveIndex}
            isAirRaid={state.isAirRaid}
            onSpeedChange={handleSpeedChange}
          />

          {/* Air Raid Banner */}
          {state.isAirRaid && (
            <div
              className="absolute top-14 left-1/2 -translate-x-1/2 text-white px-6 py-2 rounded-lg font-bold text-sm tracking-wider animate-pulse"
              style={{ background: 'rgba(220,38,38,0.85)', boxShadow: '0 0 30px rgba(220,38,38,0.5)' }}
            >
              ⚠️ ПОВІТРЯНА ТРИВОГА ⚠️
            </div>
          )}

          {/* QTE */}
          {state.qteActive && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <div className="px-8 py-4 rounded-xl animate-pulse" style={{ background: 'rgba(234,179,8,0.15)', border: '2px solid rgba(234,179,8,0.6)', boxShadow: '0 0 40px rgba(234,179,8,0.2)' }}>
                <p className="text-2xl font-bold mb-2" style={{ color: '#eab308' }}>Натисни [{state.qteKey}]</p>
                <div className="w-48 h-2 rounded-full overflow-hidden mx-auto" style={{ background: '#374151' }}>
                  <div className="h-full transition-all rounded-full" style={{ width: `${(state.qteTimer / 2000) * 100}%`, background: '#eab308' }} />
                </div>
              </div>
            </div>
          )}

          {/* Pause */}
          {state.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(6,10,20,0.6)' }}>
              <span className="text-5xl font-bold text-white">⏸ ПАУЗА</span>
            </div>
          )}

          {/* Station panel */}
          {selStation && (
            <StationPanel
              station={selStation}
              money={state.money}
              onClose={() => setSelectedStation(null)}
              onDeployAA={handleDeployAA}
              onShield={handleShield}
              onUpgrade={handleUpgradeStation}
              onEvacuate={handleEvacuate}
              onToggle={handleToggleStation}
            />
          )}

          <ActionBar
            money={state.money}
            selectedTrain={state.selectedTrain}
            selectedTrainLevel={selectedTrainLevel}
            onBuyTrain={handleBuyTrain}
            onReinforcements={handleReinforcements}
            onUpgradeTrain={handleUpgradeTrain}
          />

          {/* Zoom controls */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-auto">
            <button
              onClick={() => { stateRef.current.camera.targetZoom = Math.min(4, stateRef.current.camera.targetZoom * 1.3); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>+</button>
            <button
              onClick={() => { stateRef.current.camera.targetZoom = Math.max(0.3, stateRef.current.camera.targetZoom * 0.7); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>−</button>
            <button
              onClick={() => { stateRef.current.camera.targetX = 0; stateRef.current.camera.targetY = 0; stateRef.current.camera.targetZoom = 1; }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>⌂</button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameCanvas;
