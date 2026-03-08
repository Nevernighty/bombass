import React, { useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { createInitialState, attackDrone, dispatchRepair, reverseTrain, setSpeedMultiplier, purchaseTrain, deployAntiAir, activateShield, callReinforcements, upgradeStation, evacuateStation, toggleStationOpen, upgradeTrainCapacity, buyGenerator, buyRadar, placeDecoy, emergencySpeedBoost, toggleShelter, sealTunnel, emergencyBrake, activateDoubleFare, activateExpressLine, toggleBlackout, activateSignalFlare, passengerAirdrop, activateDroneJammer, emergencyFund, activateStationMagnet, buySAMBattery, launchInterceptor, buyAATurret, fortifyStation, activateDroneEMP, activateTrainShield, rerouteTrain, mergeTrains, sellTrain, closeLineSegment, reopenLineSegment, globalEventBus } from './GameEngine';
import { GameState, GameMode, CameraMode } from './types';
import { AudioEngine } from './AudioEngine';
import { GAME_CONFIG } from './constants';
import { SCENARIOS } from './config/scenarios';
import SceneContent from './Scene3D';
import { TopBar } from './ui/TopBar';
import { StationPanel } from './ui/StationPanel';
import { ActionBar } from './ui/ActionBar';
import { CameraControls } from './ui/CameraControls';
import { AchievementToast } from './ui/AchievementToast';
import { AudioFeedback } from './core/AudioFeedback';
import { Minimap } from './ui/Minimap';
import { Achievement } from './types';

const useWheelHandler = (stateRef: React.MutableRefObject<GameState>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      // Logarithmic zoom
      const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
      stateRef.current.camera.targetZoom = Math.max(0.2, Math.min(5, stateRef.current.camera.targetZoom * zoomDelta));
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
  const isRotatingRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [hudState, setHudState] = useState<GameState>(stateRef.current);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);
  const prevAchCountRef = useRef(0);

  const audioFeedbackRef = useRef<AudioFeedback | null>(null);

  const startGame = useCallback((mode: GameMode = 'classic') => {
    stateRef.current = createInitialState(mode);
    stateRef.current.gameStarted = true;
    audioRef.current.init();
    audioRef.current.resume();
    audioRef.current.startAmbientMusic();
    if (!audioFeedbackRef.current) {
      audioFeedbackRef.current = new AudioFeedback(audioRef.current, globalEventBus);
    }
    prevAchCountRef.current = 0;
    setHudState({ ...stateRef.current });
  }, []);

  const restartGame = useCallback(() => {
    audioRef.current.stopMusic();
    audioRef.current.stopSiren();
    stateRef.current = createInitialState(stateRef.current.gameMode);
    stateRef.current.gameStarted = true;
    audioRef.current.startAmbientMusic();
    prevAchCountRef.current = 0;
    setHudState({ ...stateRef.current });
  }, []);

  const handleStateChange = useCallback((state: GameState) => {
    const unlocked = state.achievements.filter(a => a.unlocked);
    if (unlocked.length > prevAchCountRef.current) {
      const newest = unlocked[unlocked.length - 1];
      setLastAchievement(newest);
      prevAchCountRef.current = unlocked.length;
    }
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

  const setCameraMode = useCallback((mode: CameraMode) => {
    stateRef.current.camera.mode = mode;
    if (mode === 'overview') {
      stateRef.current.camera.targetX = 0;
      stateRef.current.camera.targetY = 0;
      stateRef.current.camera.targetZoom = 0.35;
    } else if (mode === 'free') {
      stateRef.current.camera.targetZoom = 1;
    }
    setHudState({ ...stateRef.current });
  }, []);

  // Keyboard shortcuts — WASD + game controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // WASD camera panning (add to keysDown set)
      if (['w','a','s','d','W','A','S','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        stateRef.current.camera.keysDown.add(e.key);
        return;
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
      // Camera mode shortcuts
      if (e.key === 'f' || e.key === 'F') setCameraMode('follow');
      if (e.key === 'o' || e.key === 'O') setCameraMode('overview');
      if (e.key === 'c' || e.key === 'C') setCameraMode('cinematic');
      if (e.key === 'Escape') setCameraMode('free');
      // Game action shortcuts
      if (e.key === 'q' || e.key === 'Q') {
        // Quick buy train — cycle lines
        const lines: ('red' | 'blue' | 'green')[] = ['red', 'blue', 'green'];
        const counts = lines.map(l => stateRef.current.trains.filter(t => t.line === l).length);
        const minLine = lines[counts.indexOf(Math.min(...counts))];
        act(s => purchaseTrain(s, minLine));
      }
      if (e.key === 'e' || e.key === 'E') act(s => {
        // Deploy AA at hovered/selected station
        const sid = s.hoveredStation || selectedStation;
        return sid ? deployAntiAir(s, sid) : s;
      });
      if (e.key === 'r' || e.key === 'R') act(s => callReinforcements(s));
      if (e.key === 't' || e.key === 'T') act(s => placeDecoy(s));
      if (e.key === 'g' || e.key === 'G') {
        // Cycle game speed
        const speeds = [1, 2, 5, 10];
        const cur = stateRef.current.speedMultiplier;
        const idx = speeds.indexOf(cur);
        const next = speeds[(idx + 1) % speeds.length];
        stateRef.current = setSpeedMultiplier({ ...stateRef.current }, next);
        setHudState({ ...stateRef.current });
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle stations
        const ids = stateRef.current.activeStationIds;
        if (ids.length > 0) {
          const curIdx = selectedStation ? ids.indexOf(selectedStation) : -1;
          const nextIdx = (curIdx + 1) % ids.length;
          setSelectedStation(ids[nextIdx]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.camera.keysDown.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setCameraMode, selectedStation]);

  const containerRef = useWheelHandler(stateRef);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      isRotatingRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isRotatingRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      stateRef.current.camera.orbitAngle += dx * 0.005;
      // Tilt with vertical mouse movement
      stateRef.current.camera.tiltAngle = Math.max(0.2, Math.min(1.4, stateRef.current.camera.tiltAngle - dy * 0.003));
      panStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const zoom = stateRef.current.camera.zoom;
      const panSpeed = 0.12 / Math.max(zoom, 0.5);
      stateRef.current.camera.targetX -= dx * panSpeed;
      stateRef.current.camera.targetY -= dy * panSpeed;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);
  const handleMouseUp = useCallback(() => { isPanningRef.current = false; isRotatingRef.current = false; }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); }, []);

  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 }; }
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist: Math.sqrt(dx * dx + dy * dy) };
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
        stateRef.current.camera.targetZoom = Math.max(0.2, Math.min(5, stateRef.current.camera.targetZoom * scale));
      }
      touchStartRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist };
    }
  }, []);
  const handleTouchEnd = useCallback(() => { touchStartRef.current = null; }, []);

  const state = hudState;
  const act = useCallback((fn: (s: GameState) => GameState) => {
    stateRef.current = fn({ ...stateRef.current });
    setHudState({ ...stateRef.current });
  }, []);

  const selStation = selectedStation ? state.stations.find(s => s.id === selectedStation) : null;
  const selectedTrainLevel = state.selectedTrain ? (state.trains.find(t => t.id === state.selectedTrain)?.level || 1) : 1;

  return (
    <div ref={containerRef} className="relative w-full h-full select-none"
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

      <Canvas shadows gl={{ antialias: true, alpha: false }} style={{ background: '#060a14' }}>
        <Suspense fallback={null}>
          <SceneContent stateRef={stateRef} audioRef={audioRef} onStateChange={handleStateChange}
            onStationClick={handleStationClick} onTrainClick={handleTrainClick}
            onStationHover={handleStationHover} onDroneClick={handleDroneClick} />
        </Suspense>
      </Canvas>

      {/* Kill flash */}
      {state.killFlashTimer > 0 && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: '3px solid rgba(255,255,255,0.6)',
          borderRadius: '4px',
          opacity: Math.min(1, state.killFlashTimer / 200),
        }} />
      )}

      {/* Screen pulse */}
      {state.screenPulseTimer > 0 && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: `4px solid ${state.screenPulseColor}`,
          borderRadius: '4px',
          opacity: Math.min(0.6, state.screenPulseTimer / 500),
        }} />
      )}

      {/* Lives warning — red edge glow */}
      {state.lives <= 1 && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{
          boxShadow: 'inset 0 0 60px rgba(239,68,68,0.4)',
        }} />
      )}

      {/* Swarm warning */}
      {state.swarmWarningTimer > 0 && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{
          boxShadow: 'inset 0 0 80px rgba(245,158,11,0.3)',
        }} />
      )}

      {/* Air raid vignette */}
      {state.isAirRaid && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(220,38,38,0.15) 100%)',
        }} />
      )}

      {/* Blackout vignette */}
      {state.blackoutMode && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
        }} />
      )}

      {/* Rain overlay */}
      {state.isRaining && state.gameStarted && !state.gameOver && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(100,150,200,0.03) 0%, rgba(50,80,120,0.08) 100%)',
        }} />
      )}

      {/* Floating score numbers with CSS animation */}
      {state.gameStarted && !state.gameOver && state.floatingScores.map(fs => {
        const isCrit = fs.text.includes('КРИТ');
        return (
          <div key={fs.id} className={`absolute pointer-events-none font-bold ${isCrit ? 'animate-float-score-crit' : 'animate-float-score'}`}
            style={{
              left: `${fs.x}%`,
              top: `${fs.y}%`,
              color: fs.color,
              fontSize: `${16 + fs.scale * 10}px`,
              textShadow: isCrit ? `0 0 12px ${fs.color}, 0 2px 8px rgba(0,0,0,0.9)` : '0 2px 8px rgba(0,0,0,0.8)',
              fontWeight: 900,
              letterSpacing: '0.5px',
            }}>
            {fs.text}
          </div>
        );
      })}

      {/* Combo streak bar */}
      {state.gameStarted && !state.gameOver && state.combo > 1.5 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: '200px' }}>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(100, (state.combo / 5) * 100)}%`,
              background: state.combo >= 3 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #22c55e, #4ade80)',
              boxShadow: state.combo >= 3 ? '0 0 10px rgba(245,158,11,0.5)' : 'none',
            }} />
          </div>
          <div className="text-center text-xs font-bold mt-0.5" style={{
            color: state.combo >= 3 ? '#fbbf24' : '#4ade80',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            x{state.combo.toFixed(1)} КОМБО
          </div>
        </div>
      )}

      {/* Achievement toast */}
      <AchievementToast achievement={lastAchievement} onDismiss={() => setLastAchievement(null)} />

      {/* START SCREEN */}
      {!state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{
          background: 'hsla(var(--game-bg), 0.96)',
        }}>
          <div className="text-center p-8 rounded-xl max-w-2xl w-full mx-4 game-panel">
            <h1 className="text-5xl font-bold mb-1 tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              {'KYIV TRANSIT'.split('').map((ch, i) => (
                <span key={i} className="inline-block" style={{
                  animation: `title-letter 0.4s ease-out ${i * 0.04}s both`,
                }}>
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              ))}
            </h1>
            <p className="text-lg mb-6 font-bold tracking-[0.3em]" style={{
              color: 'hsl(var(--game-accent))',
              animation: 'title-letter 0.5s ease-out 0.5s both',
            }}>RESILIENCE</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {(Object.values(SCENARIOS)).map((sc, idx) => (
                <button key={sc.id} onClick={() => startGame(sc.id)}
                  className="game-btn-hover p-4 rounded-lg text-left transition-all hover:border-[hsl(var(--game-accent))]/40"
                  style={{
                    background: 'hsla(var(--muted), 0.3)',
                    border: '1px solid hsl(var(--border))',
                    animation: `mode-card-in 0.4s ease-out ${0.6 + idx * 0.08}s both`,
                  }}>
                  <p className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{sc.nameUa}</p>
                  <p className="text-[11px] leading-tight mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{sc.descriptionUa}</p>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${(sc.difficulty / 5) * 100}%`,
                      background: sc.difficulty <= 2 ? 'hsl(145, 63%, 49%)' : sc.difficulty <= 3 ? 'hsl(var(--game-accent))' : 'hsl(var(--destructive))',
                    }} />
                  </div>
                  {sc.id === 'classic' && (
                    <span className="block text-[10px] font-bold mt-2 tracking-wider" style={{ color: 'hsl(var(--game-accent))' }}>
                      ▶ ГРАТИ
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* How to Play tutorial */}
            <div className="mb-4 p-3 rounded-lg text-left" style={{
              background: 'hsla(var(--muted), 0.2)',
              border: '1px solid hsl(var(--border))',
              animation: 'title-letter 0.4s ease-out 1s both',
            }}>
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'hsl(var(--game-accent))' }}>Як грати</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <p>🚇 Купуй потяги M1/M2/M3 для перевезення пасажирів</p>
                <p>🏗️ Клікай по станціях для апгрейдів та оборони</p>
                <p>🎯 Клікай по дронах щоб збивати їх</p>
                <p>🛡️ Пережий повітряні тривоги та достав пасажирів</p>
              </div>
            </div>

            <div className="text-[11px] space-y-0.5 font-mono" style={{ color: 'hsl(var(--muted-foreground))', animation: 'title-letter 0.4s ease-out 1.2s both' }}>
              <p>WASD рух · Колесо зум · ПКМ обертання · Клік по дрону</p>
              <p>Пробіл пауза · 1-4 швидкість · F/O/C камера · Q/E/R/T дії</p>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY */}
      {(state.gameOver || state.winConditionMet) && state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,10,20,0.94)' }}>
          {/* Victory confetti */}
          {state.winConditionMet && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-sm" style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: '-8px',
                  background: ['#eab308', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f97316'][i % 6],
                  '--confetti-x': `${(Math.random() - 0.5) * 60}px`,
                  '--confetti-drift': `${(Math.random() - 0.5) * 80}px`,
                  animation: `confetti-fall ${2 + Math.random() * 2}s linear ${Math.random() * 1.5}s infinite`,
                } as React.CSSProperties} />
              ))}
            </div>
          )}
          <div className="text-center p-8 rounded-xl max-w-md game-panel" style={{
            border: `1px solid ${state.winConditionMet ? 'hsla(145, 63%, 49%, 0.3)' : 'hsla(0, 72%, 51%, 0.15)'}`,
            animation: state.winConditionMet ? 'victory-glow 2s ease-in-out infinite' : undefined,
          }}>
            <h2 className="text-3xl font-bold mb-5" style={{
              color: state.winConditionMet ? 'hsl(145, 63%, 49%)' : 'hsl(var(--destructive))',
              animation: 'title-letter 0.4s ease-out both',
            }}>
              {state.winConditionMet ? 'ПЕРЕМОГА' : 'ГАМОВЕР'}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              {[
                { label: 'Рахунок', value: String(Math.round(state.score)), accent: true },
                { label: 'Час', value: `${Math.floor(state.elapsedTime / 60000)}:${String(Math.floor((state.elapsedTime % 60000) / 1000)).padStart(2, '0')}` },
                { label: 'Пасажирів', value: String(state.passengersDelivered) },
                { label: 'Дронів збито', value: `${state.dronesIntercepted}/${state.totalDrones}` },
                { label: 'Макс. комбо', value: `x${state.maxCombo.toFixed(1)}` },
                { label: 'Будівлі', value: String(state.buildingsDestroyed) },
              ].map((stat, i) => (
                <div key={i} className="text-left" style={{ color: 'hsl(var(--muted-foreground))', animation: `stat-reveal 0.3s ease-out ${0.3 + i * 0.12}s both` }}>
                  <span>{stat.label}</span>
                  <span className="float-right font-bold" style={{
                    color: stat.accent ? 'hsl(var(--game-accent))' : 'hsl(var(--foreground))',
                  }}>{stat.value}</span>
                </div>
              ))}
            </div>
            {state.achievements.filter(a => a.unlocked).length > 0 && (
              <div className="mb-5" style={{ animation: 'stat-reveal 0.3s ease-out 1.2s both' }}>
                <p className="text-[10px] mb-1.5 font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--game-accent))' }}>Досягнення</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {state.achievements.filter(a => a.unlocked).map((a, i) => (
                    <span key={a.id} className="text-lg px-1 py-0.5 rounded" title={a.nameUa} style={{
                      background: 'hsl(var(--muted))',
                      animation: `mode-card-in 0.3s ease-out ${1.4 + i * 0.1}s both`,
                    }}>{a.icon}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={restartGame}
              className="game-btn-hover px-8 py-3 font-bold rounded-lg text-base"
              style={{
                background: 'hsl(var(--game-accent))',
                color: 'hsl(var(--game-bg))',
                animation: 'stat-reveal 0.3s ease-out 1.8s both',
              }}>
              ГРАТИ ЗНОВУ
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {state.gameStarted && !state.gameOver && !state.winConditionMet && (
        <>
          <TopBar
            score={state.score} combo={state.combo} money={state.money} lives={state.lives}
            speedMultiplier={state.speedMultiplier} elapsedTime={state.elapsedTime}
            passengersDelivered={state.passengersDelivered} dronesIntercepted={state.dronesIntercepted}
            totalDrones={state.totalDrones} networkEfficiency={state.networkEfficiency}
            isNight={state.isNight} waveIndex={state.waveIndex} isAirRaid={state.isAirRaid}
            airRaidTimer={state.airRaidTimer}
            powerGrid={state.powerGrid} maxPower={state.maxPower}
            rushHourActive={state.rushHourActive} radarActive={state.radarActive}
            satisfactionRate={state.satisfactionRate} buildingsDestroyed={state.buildingsDestroyed}
            gameMode={state.gameMode} winConditionMet={state.winConditionMet}
            cameraMode={state.camera.mode} isRaining={state.isRaining}
            passiveIncome={state.activeStationIds.length}
            onSpeedChange={(m) => act(s => setSpeedMultiplier(s, m))}
          />

          {state.isAirRaid && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 text-white px-6 py-2 rounded-lg font-bold text-sm tracking-wider animate-pulse"
              style={{ background: 'rgba(220,38,38,0.85)', boxShadow: '0 0 30px rgba(220,38,38,0.5)' }}>
              ⚠️ ПОВІТРЯНА ТРИВОГА ⚠️
            </div>
          )}

          {state.rushHourActive && (
            <div className="absolute top-14 right-4 text-white px-4 py-1.5 rounded-lg font-bold text-xs tracking-wider animate-pulse"
              style={{ background: 'rgba(234,179,8,0.85)', color: '#1a1a2e', boxShadow: '0 0 20px rgba(234,179,8,0.4)' }}>
              🚇 ГОДИНА ПІК x3
            </div>
          )}

          {state.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(6,10,20,0.6)' }}>
              <span className="text-5xl font-bold text-white">⏸ ПАУЗА</span>
            </div>
          )}

          {selStation && (
            <StationPanel
              station={selStation} money={state.money} isAirRaid={state.isAirRaid}
              speedBoostCooldown={state.speedBoostCooldown} stationMagnetTimer={state.stationMagnetTimer}
              onClose={() => setSelectedStation(null)}
              onDeployAA={() => act(s => deployAntiAir(s, selStation.id))}
              onShield={() => act(s => activateShield(s, selStation.id))}
              onUpgrade={() => act(s => upgradeStation(s, selStation.id))}
              onEvacuate={() => act(s => evacuateStation(s, selStation.id))}
              onToggle={() => act(s => toggleStationOpen(s, selStation.id))}
              onShelter={() => act(s => toggleShelter(s, selStation.id))}
              onSealTunnel={() => act(s => sealTunnel(s, selStation.id))}
              onSpeedBoost={() => act(s => emergencySpeedBoost(s, selStation.line))}
              onExpressLine={() => act(s => activateExpressLine(s, selStation.line))}
              onStationMagnet={() => act(s => activateStationMagnet(s, selStation.id))}
              onBuySAM={() => act(s => buySAMBattery(s, selStation.id))}
              onBuyAATurret={() => act(s => buyAATurret(s, selStation.id))}
              onLaunchInterceptor={() => act(s => launchInterceptor(s, selStation.id))}
              onFortify={() => act(s => fortifyStation(s, selStation.id))}
              onEMP={() => act(s => activateDroneEMP(s, selStation.id))}
            />
          )}

          <ActionBar
            money={state.money} selectedTrain={state.selectedTrain} selectedTrainLevel={selectedTrainLevel}
            radarActive={state.radarActive} speedBoostCooldown={state.speedBoostCooldown}
            doubleFareTimer={state.doubleFareTimer} expressTimer={state.expressTimer}
            blackoutMode={state.blackoutMode} signalFlareTimer={state.signalFlareTimer}
            droneJammerTimer={state.droneJammerTimer} emergencyBrakeTimer={state.emergencyBrakeTimer}
            stationMagnetTimer={state.stationMagnetTimer} lives={state.lives}
            onBuyTrain={(l) => act(s => purchaseTrain(s, l))}
            onReinforcements={() => act(s => callReinforcements(s))}
            onUpgradeTrain={() => state.selectedTrain ? act(s => upgradeTrainCapacity(s, state.selectedTrain!)) : undefined}
            onBuyGenerator={() => act(s => buyGenerator(s))}
            onBuyRadar={() => act(s => buyRadar(s))}
            onPlaceDecoy={() => act(s => placeDecoy(s))}
            onSpeedBoost={(l) => act(s => emergencySpeedBoost(s, l))}
            onEmergencyBrake={() => act(s => emergencyBrake(s))}
            onDoubleFare={() => act(s => activateDoubleFare(s))}
            onExpressLine={(l) => act(s => activateExpressLine(s, l))}
            onBlackout={() => act(s => toggleBlackout(s))}
            onSignalFlare={() => act(s => activateSignalFlare(s))}
            onPassengerAirdrop={() => act(s => passengerAirdrop(s))}
            onDroneJammer={() => act(s => activateDroneJammer(s))}
            onEmergencyFund={() => act(s => emergencyFund(s))}
            onTrainShield={() => state.selectedTrain ? act(s => activateTrainShield(s, state.selectedTrain!)) : undefined}
          />

          <CameraControls currentMode={state.camera.mode} onSetMode={setCameraMode} />

          <Minimap stateRef={stateRef} state={state} />
        </>
      )}
    </div>
  );
};

export default GameCanvas;
