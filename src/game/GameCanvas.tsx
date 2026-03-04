import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameRenderer } from './Renderer';
import { AudioEngine } from './AudioEngine';
import { createInitialState, updateGame, handleQteInput, dispatchRepair, reverseTrain } from './GameEngine';
import { GameState } from './types';
import { GAME_CONFIG } from './constants';

interface GameCanvasProps {
  onStateChange?: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const audioRef = useRef<AudioEngine>(new AudioEngine());
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);

  const getState = () => stateRef.current;
  const setState = (s: GameState) => {
    stateRef.current = s;
    onStateChange?.(s);
  };

  // Start game
  const startGame = useCallback(() => {
    const s = { ...stateRef.current };
    s.gameStarted = true;
    setState(s);
    audioRef.current.init();
    audioRef.current.resume();
    audioRef.current.startAmbientMusic();
  }, []);

  // Restart
  const restartGame = useCallback(() => {
    audioRef.current.stopMusic();
    audioRef.current.stopSiren();
    stateRef.current = createInitialState();
    stateRef.current.gameStarted = true;
    setState(stateRef.current);
    audioRef.current.startAmbientMusic();
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rendererRef.current?.resize(rect.width, rect.height);
    };

    rendererRef.current = new GameRenderer(ctx, canvas.clientWidth, canvas.clientHeight);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const loop = (timestamp: number) => {
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = timestamp;

      const state = getState();
      const newState = updateGame(state, dt, audioRef.current);
      stateRef.current = newState;

      // Smooth camera
      newState.camera.zoom += (newState.camera.targetZoom - newState.camera.zoom) * 0.1;
      newState.camera.x += (newState.camera.targetX - newState.camera.x) * 0.1;
      newState.camera.y += (newState.camera.targetY - newState.camera.y) * 0.1;

      resizeCanvas();
      rendererRef.current?.render(newState, dt);

      // Update React state occasionally for HUD
      if (Math.floor(timestamp / 200) !== Math.floor((timestamp - dt) / 200)) {
        onStateChange?.(newState);
        forceUpdate(v => v + 1);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = getState();
      if (state.qteActive) {
        const newState = handleQteInput({ ...state }, e.key, audioRef.current);
        setState(newState);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setState({ ...getState(), isPaused: !getState().isPaused });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const state = getState();

    if (e.button === 2 || e.button === 1) {
      // Right/middle click = pan
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!state.gameStarted) {
      startGame();
      return;
    }

    // Hit test trains
    const trainId = rendererRef.current.hitTestTrain(mx, my, state);
    if (trainId) {
      audioRef.current.playClick();
      const newState = reverseTrain({ ...state }, trainId);
      newState.selectedTrain = trainId;
      setState(newState);
      return;
    }

    // Hit test stations
    const stationId = rendererRef.current.hitTestStation(mx, my, state);
    if (stationId) {
      audioRef.current.playClick();
      const station = state.stations.find(s => s.id === stationId);
      if (station && (station.isDestroyed || station.isOnFire)) {
        const newState = dispatchRepair({ ...state }, stationId);
        setState(newState);
      }
      setState({ ...getState(), hoveredStation: stationId });
    }
  }, [startGame]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const state = getState();
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      state.camera.targetX -= dx / state.camera.zoom;
      state.camera.targetY -= dy / state.camera.zoom;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const state = getState();
    const stationId = rendererRef.current.hitTestStation(mx, my, state);
    if (stationId !== state.hoveredStation) {
      setState({ ...state, hoveredStation: stationId });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const state = getState();
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.targetZoom = Math.max(0.4, Math.min(3, state.camera.targetZoom * zoomDelta));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const state = stateRef.current;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* Start Screen Overlay */}
      {!state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-game-overlay">
          <div className="text-center glass-panel p-8 rounded-2xl max-w-lg">
            <h1 className="text-4xl font-bold text-game-text mb-2 tracking-tight">
              KYIV TRANSIT
            </h1>
            <p className="text-xl text-game-accent mb-1">RESILIENCE</p>
            <p className="text-game-muted text-sm mb-6">
              Керуйте метро Києва. Перевозьте пасажирів. Захищайте місто.
            </p>
            <div className="text-game-muted text-xs mb-4 space-y-1">
              <p>🖱️ Клік по потягу — змінити напрямок</p>
              <p>🖱️ Клік по пошкодженій станції — відправити ДСНС</p>
              <p>🔲 Q/W/E/R — збити дрон (QTE)</p>
              <p>⚡ Колесо миші — зум | Права кнопка — переміщення</p>
              <p>⏸️ Пробіл — пауза</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-game-accent text-game-bg font-bold rounded-lg 
                         hover:bg-game-accent-hover transition-colors text-lg"
            >
              ПОЧАТИ ГРУ
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {state.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-game-overlay">
          <div className="text-center glass-panel p-8 rounded-2xl max-w-md">
            <h2 className="text-3xl font-bold text-destructive mb-4">ГАМОВЕР</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-game-muted mb-6">
              <div>Рахунок: <span className="text-game-text font-bold">{state.score}</span></div>
              <div>Пасажирів: <span className="text-game-text font-bold">{state.passengersDelivered}</span></div>
              <div>Дронів збито: <span className="text-game-text font-bold">{state.dronesIntercepted}</span></div>
              <div>Макс. комбо: <span className="text-game-text font-bold">x{state.maxCombo.toFixed(1)}</span></div>
              <div>Станцій відремонтовано: <span className="text-game-text font-bold">{state.stationsRepaired}</span></div>
              <div>Піковий потік: <span className="text-game-text font-bold">{state.peakLoad}</span></div>
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-game-accent text-game-bg font-bold rounded-lg 
                         hover:bg-game-accent-hover transition-colors"
            >
              ГРАТИ ЗНОВУ
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {state.gameStarted && !state.gameOver && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-3 pointer-events-none">
            <div className="glass-panel px-4 py-2 rounded-xl pointer-events-auto">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-game-text font-bold text-lg">{Math.round(state.score)}</span>
                <span className="text-game-muted">x{Math.round(state.combo * 10) / 10}</span>
                <span className="text-game-muted">
                  {'❤️'.repeat(state.lives)}{'🖤'.repeat(Math.max(0, 3 - state.lives))}
                </span>
              </div>
            </div>

            <div className="glass-panel px-4 py-2 rounded-xl pointer-events-auto">
              <div className="flex items-center gap-3 text-xs text-game-muted">
                <span>🚇 {state.passengersDelivered}</span>
                <span>🎯 {state.dronesIntercepted}/{state.totalDrones}</span>
                <span>📊 {state.networkEfficiency}%</span>
                <span>{state.isNight ? '🌙' : '☀️'}</span>
              </div>
            </div>
          </div>

          {/* Air Raid Banner */}
          {state.isAirRaid && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 
                          bg-destructive/90 text-destructive-foreground px-6 py-2 rounded-lg 
                          animate-pulse font-bold text-sm tracking-wider">
              ⚠️ ПОВІТРЯНА ТРИВОГА ⚠️
            </div>
          )}

          {/* Pause indicator */}
          {state.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-game-overlay pointer-events-none">
              <span className="text-4xl font-bold text-game-text">⏸ ПАУЗА</span>
            </div>
          )}

          {/* Hovered station info */}
          {state.hoveredStation && (() => {
            const s = state.stations.find(st => st.id === state.hoveredStation);
            if (!s) return null;
            return (
              <div className="absolute bottom-4 left-4 glass-panel px-4 py-3 rounded-xl text-xs">
                <p className="text-game-text font-bold">{s.nameUa}</p>
                <p className="text-game-muted">
                  {s.line === 'red' ? 'M1' : s.line === 'blue' ? 'M2' : 'M3'} • 
                  {s.depth === 'deep' ? ' Глибока' : ' Мілка'} • 
                  HP: {s.hp}% • 
                  Пасажирів: {s.passengers.length}
                  {s.isOnFire ? ' 🔥' : ''}
                  {s.isDestroyed ? ' 💀' : ''}
                  {s.isRepairing ? ` 🔧 ${Math.round(s.repairProgress * 100)}%` : ''}
                </p>
              </div>
            );
          })()}

          {/* Unlocked routes */}
          {state.unlockedRoutes.length > 0 && (
            <div className="absolute bottom-4 right-4 glass-panel px-3 py-2 rounded-xl text-xs text-game-muted">
              {state.unlockedRoutes.map(id => {
                const type = id.startsWith('bus') ? '🚌' : id.startsWith('tram') ? '🚋' : '🚂';
                return <span key={id} className="mr-2">{type}</span>;
              })}
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={() => { getState().camera.targetZoom = Math.min(3, getState().camera.targetZoom * 1.3); }}
              className="glass-panel w-8 h-8 rounded-lg text-game-text font-bold text-lg flex items-center justify-center hover:bg-game-glass-hover"
            >+</button>
            <button
              onClick={() => { getState().camera.targetZoom = Math.max(0.4, getState().camera.targetZoom * 0.7); }}
              className="glass-panel w-8 h-8 rounded-lg text-game-text font-bold text-lg flex items-center justify-center hover:bg-game-glass-hover"
            >−</button>
            <button
              onClick={() => { const c = getState().camera; c.targetZoom = 1; c.targetX = 0; c.targetY = 0; }}
              className="glass-panel w-8 h-8 rounded-lg text-game-muted text-xs flex items-center justify-center hover:bg-game-glass-hover"
            >⌂</button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameCanvas;
