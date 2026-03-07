import React, { useRef, useState, Suspense, useMemo } from 'react';
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

    cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;
    cam.x += (cam.targetX - cam.x) * 0.1;
    cam.y += (cam.targetY - cam.y) * 0.1;

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 8 * cam.zoom;
    ortho.updateProjectionMatrix();

    const baseX = 30;
    const baseY = 50;
    const baseZ = 30;
    ortho.position.set(baseX - cam.x, baseY, baseZ - cam.y);
    ortho.lookAt(-cam.x, 0, -cam.y);

    if (state.screenShake > 0) {
      ortho.position.x += (Math.random() - 0.5) * state.screenShake * 0.3;
      ortho.position.z += (Math.random() - 0.5) * state.screenShake * 0.3;
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
    if (lastUpdateRef.current > 200) {
      lastUpdateRef.current = 0;
      onStateChange(stateRef.current);
    }
  });

  return null;
}

// Procedural buildings scattered around the map
function CityBuildings() {
  const buildings = useMemo(() => {
    const result: { x: number; z: number; w: number; h: number; d: number; color: string }[] = [];
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);

    for (let i = 0; i < 70; i++) {
      const nx = rand();
      const ny = rand();
      const [wx, , wz] = toWorld(nx, ny);
      
      // Skip if too close to metro stations
      const tooClose = STATIONS.some(s => {
        const [sx, , sz] = toWorld(s.x, s.y);
        const dx = wx - sx;
        const dz = wz - sz;
        return Math.sqrt(dx * dx + dz * dz) < 4;
      });
      if (tooClose) continue;

      const h = 0.5 + rand() * 4;
      const w = 0.8 + rand() * 1.5;
      const d = 0.8 + rand() * 1.5;
      const brightness = 15 + Math.floor(rand() * 20);
      const color = `hsl(220, 10%, ${brightness}%)`;
      result.push({ x: wx, z: wz, w, h, d, color });
    }
    return result;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} metalness={0.2} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({
  stateRef, audioRef, onStateChange,
  onStationClick, onTrainClick, onStationHover,
}: SceneContentProps) {
  const [tick, setTick] = useState(0);
  const lastTickRef = useRef(0);

  useFrame((_, delta) => {
    lastTickRef.current += delta;
    if (lastTickRef.current > 0.3) {
      lastTickRef.current = 0;
      setTick(t => t + 1);
    }
  });

  const state = stateRef.current;
  const activeStationIds = state.activeStationIds;
  const trainIds = state.trains.map(t => t.id);
  const droneIds = state.drones.filter(d => !d.isDestroyed).map(d => d.id);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[30, 50, 30]}
        zoom={8}
        near={-1000}
        far={1000}
      />
      <CameraController stateRef={stateRef} />
      <GameLoop stateRef={stateRef} audioRef={audioRef} onStateChange={onStateChange} />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#0a0e1a', 60, 140]} />

      {/* Lighting */}
      <ambientLight intensity={state.isNight ? 0.25 : 0.55} color={state.isNight ? '#3344aa' : '#ffffff'} />
      <directionalLight
        position={[20, 40, 10]}
        intensity={state.isNight ? 0.2 : 0.8}
        color={state.isNight ? '#4466aa' : '#ffffee'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {state.isNight && (
        <hemisphereLight args={['#112244', '#000011', 0.15]} />
      )}
      {state.isAirRaid && (
        <pointLight position={[0, 30, 0]} color="#ff2200" intensity={0.5 + Math.sin(Date.now() * 0.005) * 0.3} distance={100} />
      )}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[140, 120]} />
        <meshStandardMaterial
          color={state.isNight ? '#080c16' : '#101624'}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      <gridHelper args={[140, 28, '#151e38', '#151e38']} position={[0, 0.01, 0]} />

      <RiverPlane />
      <CityBuildings />

      {/* Metro lines */}
      <MetroLine3D line="red" stateRef={stateRef} />
      <MetroLine3D line="blue" stateRef={stateRef} />
      <MetroLine3D line="green" stateRef={stateRef} />

      {/* Stations */}
      {activeStationIds.map(id => (
        <StationNode3D
          key={id}
          stationId={id}
          stateRef={stateRef}
          onClick={onStationClick}
          onHover={onStationHover}
        />
      ))}

      {/* Trains */}
      {trainIds.map(id => (
        <TrainModel
          key={id}
          trainId={id}
          stateRef={stateRef}
          onClick={onTrainClick}
        />
      ))}

      {/* Drones */}
      {droneIds.map(id => (
        <DroneModel
          key={id}
          droneId={id}
          stateRef={stateRef}
        />
      ))}

      <ExplosionsLayer stateRef={stateRef} />
      <RepairUnitsLayer stateRef={stateRef} />
      <NotificationsLayer stateRef={stateRef} />
    </>
  );
}

export default SceneContent;
