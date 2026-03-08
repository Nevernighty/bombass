import React, { useRef, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from './types';
import { updateGame, getActiveLineStations } from './GameEngine';
import { AudioEngine } from './AudioEngine';
import { STATIONS, toWorld } from './constants';
import { StationNode3D } from './components/StationNode3D';
import { TrainModel } from './components/TrainModel';
import { DroneModel } from './components/DroneModel';
import { MetroLine3D } from './components/MetroLine3D';
import { RiverPlane } from './components/RiverPlane';
import { ExplosionsLayer } from './components/ExplosionEffect';
import { RepairUnitsLayer } from './components/RepairUnitModel';
import { NotificationsLayer } from './components/NotificationsLayer';
import { CityBuildings } from './components/CityBuildings';

interface SceneContentProps {
  stateRef: React.MutableRefObject<GameState>;
  audioRef: React.MutableRefObject<AudioEngine>;
  onStateChange: (state: GameState) => void;
  onStationClick: (id: string) => void;
  onTrainClick: (id: string) => void;
  onStationHover: (id: string | null) => void;
}

function CameraController({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const { camera } = useThree();

  useFrame(() => {
    const state = stateRef.current;
    const cam = state.camera;

    cam.zoom += (cam.targetZoom - cam.zoom) * 0.08;
    cam.x += (cam.targetX - cam.x) * 0.08;
    cam.y += (cam.targetY - cam.y) * 0.08;

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 10 * cam.zoom;
    ortho.updateProjectionMatrix();

    const baseX = 25;
    const baseY = 45;
    const baseZ = 25;
    ortho.position.set(baseX - cam.x, baseY, baseZ - cam.y);
    ortho.lookAt(-cam.x, 0, -cam.y);

    if (state.screenShake > 0) {
      const shk = state.screenShake * 0.2;
      ortho.position.x += (Math.random() - 0.5) * shk;
      ortho.position.z += (Math.random() - 0.5) * shk;
    }
  });

  return null;
}

function GameLoop({ stateRef, audioRef, onStateChange }: {
  stateRef: React.MutableRefObject<GameState>;
  audioRef: React.MutableRefObject<AudioEngine>;
  onStateChange: (state: GameState) => void;
}) {
  const lastUpdateRef = useRef(0);

  useFrame((_, delta) => {
    const state = stateRef.current;
    if (!state.gameStarted || state.gameOver || state.isPaused) return;

    const dt = Math.min(delta * 1000, 50);
    stateRef.current = updateGame(state, dt, audioRef.current);

    lastUpdateRef.current += dt;
    if (lastUpdateRef.current > 150) {
      lastUpdateRef.current = 0;
      onStateChange(stateRef.current);
    }
  });

  return null;
}

// Manages dynamic entity lists via refs — no React state re-renders
function DynamicEntities({ stateRef, onStationClick, onTrainClick, onStationHover }: {
  stateRef: React.MutableRefObject<GameState>;
  onStationClick: (id: string) => void;
  onTrainClick: (id: string) => void;
  onStationHover: (id: string | null) => void;
}) {
  const stationGroupRef = useRef<THREE.Group>(null);
  const trainGroupRef = useRef<THREE.Group>(null);
  const droneGroupRef = useRef<THREE.Group>(null);
  const prevStationsRef = useRef('');
  const prevTrainsRef = useRef('');
  const prevDronesRef = useRef('');
  const [activeStations, setActiveStations] = React.useState<string[]>(stateRef.current.activeStationIds);
  const [trainIds, setTrainIds] = React.useState<string[]>(stateRef.current.trains.map(t => t.id));
  const [droneIds, setDroneIds] = React.useState<string[]>([]);

  useFrame(() => {
    const state = stateRef.current;
    const stKey = state.activeStationIds.join(',');
    if (stKey !== prevStationsRef.current) {
      prevStationsRef.current = stKey;
      setActiveStations([...state.activeStationIds]);
    }
    const tKey = state.trains.map(t => t.id).join(',');
    if (tKey !== prevTrainsRef.current) {
      prevTrainsRef.current = tKey;
      setTrainIds(state.trains.map(t => t.id));
    }
    const dKey = state.drones.filter(d => !d.isDestroyed).map(d => d.id).join(',');
    if (dKey !== prevDronesRef.current) {
      prevDronesRef.current = dKey;
      setDroneIds(state.drones.filter(d => !d.isDestroyed).map(d => d.id));
    }
  });

  return (
    <>
      <group ref={stationGroupRef}>
        {activeStations.map(id => (
          <StationNode3D key={id} stationId={id} stateRef={stateRef} onClick={onStationClick} onHover={onStationHover} />
        ))}
      </group>
      <group ref={trainGroupRef}>
        {trainIds.map(id => (
          <TrainModel key={id} trainId={id} stateRef={stateRef} onClick={onTrainClick} />
        ))}
      </group>
      <group ref={droneGroupRef}>
        {droneIds.map(id => (
          <DroneModel key={id} droneId={id} stateRef={stateRef} />
        ))}
      </group>
    </>
  );
}

function SceneContent({
  stateRef, audioRef, onStateChange,
  onStationClick, onTrainClick, onStationHover,
}: SceneContentProps) {
  const state = stateRef.current;

  // Dynamic lighting based on day/night and air raid
  const ambientIntensity = state.isNight ? 0.2 : 0.5;
  const ambientColor = state.isNight ? '#2233aa' : '#e8e8ff';
  const dirIntensity = state.isNight ? 0.15 : 0.7;
  const dirColor = state.isNight ? '#334488' : '#ffffee';
  const fogColor = state.isNight ? '#060a14' : '#0a0e1a';
  const groundColor = state.isNight ? '#050810' : '#0c1220';

  return (
    <>
      <OrthographicCamera makeDefault position={[25, 45, 25]} zoom={10} near={-1000} far={1000} />
      <CameraController stateRef={stateRef} />
      <GameLoop stateRef={stateRef} audioRef={audioRef} onStateChange={onStateChange} />

      <fog attach="fog" args={[fogColor, 50, 130]} />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={[20, 40, 10]} intensity={dirIntensity} color={dirColor} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      {state.isNight && <hemisphereLight args={['#112244', '#000011', 0.12]} />}
      {state.isAirRaid && (
        <pointLight position={[0, 30, 0]} color="#ff2200" intensity={0.4 + Math.sin(Date.now() * 0.004) * 0.25} distance={120} />
      )}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[160, 130]} />
        <meshStandardMaterial color={groundColor} metalness={0.05} roughness={0.95} />
      </mesh>
      <gridHelper args={[160, 32, '#121a30', '#121a30']} position={[0, 0.01, 0]} />

      <RiverPlane />
      <CityBuildings />

      {/* Metro lines */}
      <MetroLine3D line="red" stateRef={stateRef} />
      <MetroLine3D line="blue" stateRef={stateRef} />
      <MetroLine3D line="green" stateRef={stateRef} />

      {/* Dynamic entities with smart re-render */}
      <DynamicEntities
        stateRef={stateRef}
        onStationClick={onStationClick}
        onTrainClick={onTrainClick}
        onStationHover={onStationHover}
      />

      <ExplosionsLayer stateRef={stateRef} />
      <RepairUnitsLayer stateRef={stateRef} />
      <NotificationsLayer stateRef={stateRef} />
    </>
  );
}

export default SceneContent;
