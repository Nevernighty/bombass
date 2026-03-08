import React, { useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { createInitialState, attackDrone, dispatchRepair, reverseTrain, setSpeedMultiplier, purchaseTrain, deployAntiAir, activateShield, callReinforcements, upgradeStation, evacuateStation, toggleStationOpen, upgradeTrainCapacity, buyGenerator, buyRadar, placeDecoy, emergencySpeedBoost, toggleShelter, sealTunnel, emergencyBrake, activateDoubleFare, activateExpressLine, toggleBlackout, activateSignalFlare, passengerAirdrop, activateDroneJammer, emergencyFund, activateStationMagnet, buySAMBattery, launchInterceptor, buyAATurret, globalEventBus } from './GameEngine';
import { GameState, GameMode, CameraMode } from './types';
import { AudioEngine } from './AudioEngine';
import { GAME_CONFIG } from './constants';
import { SCENARIOS } from './config/scenarios';
import SceneContent from './Scene3D';
import { TopBar } from './ui/TopBar';
import { StationPanel } from './ui/StationPanel';
import { ActionBar } from './ui/ActionBar';
import { AchievementToast } from './ui/AchievementToast';
import { AudioFeedback } from './core/AudioFeedback';
import { Achievement } from './types';

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
      stateRef.current.camera.targetZoom = 0.4;
    } else if (mode === 'free') {
      stateRef.current.camera.targetZoom = 1;
    }
    setHudState({ ...stateRef.current });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCameraMode]);

  const containerRef = useWheelHandler(stateRef);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      // Right-click: start rotation
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
      stateRef.current.camera.orbitAngle += dx * 0.005;
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
        stateRef.current.camera.targetZoom = Math.max(0.3, Math.min(4, stateRef.current.camera.targetZoom * scale));
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
          backgroundSize: '3px 15px',
        }} />
      )}

      {/* Achievement toast */}
      <AchievementToast achievement={lastAchievement} onDismiss={() => setLastAchievement(null)} />

      {/* START SCREEN with Mode Selector */}
      {!state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,10,20,0.94)' }}>
          <div className="text-center p-6 rounded-2xl max-w-2xl w-full mx-4" style={{ background: 'rgba(15,22,42,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'monospace' }}>KYIV TRANSIT</h1>
            <p className="text-xl mb-4" style={{ color: '#eab308' }}>RESILIENCE</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {(Object.values(SCENARIOS)).map(sc => (
                <button key={sc.id} onClick={() => startGame(sc.id)}
                  className="p-3 rounded-lg text-left transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="text-lg mb-1">{sc.icon}</div>
                  <p className="text-sm font-bold text-white">{sc.nameUa}</p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{sc.descriptionUa}</p>
                  <div className="mt-1">
                    {'⭐'.repeat(sc.difficulty)}{'☆'.repeat(5 - sc.difficulty)}
                  </div>
                </button>
              ))}
            </div>
            <div className="text-xs space-y-0.5" style={{ color: '#6b7280' }}>
              <p>🖱️ Перетягуйте — камера | Колесо — зум | ПКМ — обертання | 🎯 Клік по дрону — атакувати</p>
              <p>⏸️ Пробіл — пауза | 1-4 — швидкість | F — слідкувати | O — огляд | C — кінематограф</p>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY */}
      {(state.gameOver || state.winConditionMet) && state.gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,10,20,0.92)' }}>
          <div className="text-center p-8 rounded-2xl max-w-md" style={{ background: 'rgba(15,22,42,0.85)', backdropFilter: 'blur(20px)', border: `1px solid ${state.winConditionMet ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <h2 className="text-3xl font-bold mb-4" style={{ color: state.winConditionMet ? '#22c55e' : '#ef4444' }}>
              {state.winConditionMet ? '🎉 ПЕРЕМОГА!' : 'ГАМОВЕР'}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4" style={{ color: '#9ca3af' }}>
              <div>Рахунок: <span className="text-white font-bold">{state.score}</span></div>
              <div>Час: <span className="text-white font-bold">{Math.floor(state.elapsedTime / 60000)}:{String(Math.floor((state.elapsedTime % 60000) / 1000)).padStart(2, '0')}</span></div>
              <div>Пасажирів: <span className="text-white font-bold">{state.passengersDelivered}</span></div>
              <div>Дронів збито: <span className="text-white font-bold">{state.dronesIntercepted}/{state.totalDrones}</span></div>
              <div>Макс. комбо: <span className="text-white font-bold">x{state.maxCombo.toFixed(1)}</span></div>
              <div>Будівлі знищено: <span className="text-white font-bold">{state.buildingsDestroyed}</span></div>
            </div>
            {state.achievements.filter(a => a.unlocked).length > 0 && (
              <div className="mb-4">
                <p className="text-xs mb-1" style={{ color: '#eab308' }}>Досягнення:</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {state.achievements.filter(a => a.unlocked).map(a => (
                    <span key={a.id} className="text-sm" title={a.nameUa}>{a.icon}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={restartGame}
              className="px-8 py-3 font-bold rounded-lg transition-all hover:scale-105"
              style={{ background: '#eab308', color: '#1a1a2e' }}>
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
            powerGrid={state.powerGrid} maxPower={state.maxPower}
            rushHourActive={state.rushHourActive} radarActive={state.radarActive}
            satisfactionRate={state.satisfactionRate} buildingsDestroyed={state.buildingsDestroyed}
            gameMode={state.gameMode} winConditionMet={state.winConditionMet}
            cameraMode={state.camera.mode} isRaining={state.isRaining}
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
          />

          {/* Camera mode toolbar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-auto">
            {([
              { mode: 'free' as CameraMode, icon: '🖱️', label: 'Вільна (Esc)' },
              { mode: 'follow' as CameraMode, icon: '🚇', label: 'Слідкувати (F)' },
              { mode: 'overview' as CameraMode, icon: '🗺️', label: 'Огляд (O)' },
              { mode: 'cinematic' as CameraMode, icon: '🎬', label: 'Кіно (C)' },
            ]).map(cm => (
              <button key={cm.mode} onClick={() => setCameraMode(cm.mode)}
                title={cm.label}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all"
                style={{
                  background: state.camera.mode === cm.mode ? 'rgba(234,179,8,0.3)' : 'rgba(10,15,30,0.85)',
                  border: `1px solid ${state.camera.mode === cm.mode ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {cm.icon}
              </button>
            ))}
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <button onClick={() => { stateRef.current.camera.targetZoom = Math.min(4, stateRef.current.camera.targetZoom * 1.3); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>+</button>
            <button onClick={() => { stateRef.current.camera.targetZoom = Math.max(0.3, stateRef.current.camera.targetZoom * 0.7); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>−</button>
            <button onClick={() => { stateRef.current.camera.targetX = 0; stateRef.current.camera.targetY = 0; stateRef.current.camera.targetZoom = 1; stateRef.current.camera.orbitAngle = 0; setCameraMode('free'); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs"
              style={{ background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>⌂</button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameCanvas;
