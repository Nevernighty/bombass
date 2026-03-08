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

    cam.zoom += (cam.targetZoom - cam.zoom) * 0.08;
    cam.x += (cam.targetX - cam.x) * 0.08;
    cam.y += (cam.targetY - cam.y) * 0.08;

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 10 * cam.zoom;
    ortho.updateProjectionMatrix();

    // Isometric angle positioned to see the full map nicely
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

// Procedural buildings — seeded, deterministic, avoid metro stations
function CityBuildings() {
  const buildings = useMemo(() => {
    const result: { x: number; z: number; w: number; h: number; d: number; color: string; emissive: string }[] = [];
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);

    for (let i = 0; i < 120; i++) {
      const nx = rand();
      const ny = rand();
      const [wx, , wz] = toWorld(nx, ny);

      // Skip if too close to metro stations
      const tooClose = STATIONS.some(s => {
        const [sx, , sz] = toWorld(s.x, s.y);
        const dx = wx - sx;
        const dz = wz - sz;
        return Math.sqrt(dx * dx + dz * dz) < 3.5;
      });
      if (tooClose) continue;

      const h = 0.3 + rand() * 5;
      const w = 0.5 + rand() * 1.8;
      const d = 0.5 + rand() * 1.8;
      const hue = 200 + Math.floor(rand() * 40);
      const sat = 5 + Math.floor(rand() * 15);
      const lightness = 12 + Math.floor(rand() * 18);
      const color = `hsl(${hue}, ${sat}%, ${lightness}%)`;
      // Some buildings have lit windows
      const hasLight = rand() > 0.6;
      const emissive = hasLight ? `hsl(45, 80%, ${5 + Math.floor(rand() * 10)}%)` : '#000000';
      result.push({ x: wx, z: wz, w, h, d, color, emissive });
    }
    return result;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color={b.color}
            emissive={b.emissive}
            emissiveIntensity={0.3}
            metalness={0.15}
            roughness={0.85}
          />
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
    if (lastTickRef.current > 0.25) {
      lastTickRef.current = 0;
      setTick(t => t + 1);
    }
  });

  const state = stateRef.current;
  const activeStationIds = state.activeStationIds;
  const trainIds = state.trains.map(t => t.id);
  const droneIds = state.drones.filter(d => !d.isDestroyed).map(d => d.id);

  // Dynamic lighting based on day/night and air raid
  const ambientIntensity = state.isNight ? 0.2 : 0.5;
  const ambientColor = state.isNight ? '#2233aa' : '#e8e8ff';
  const dirIntensity = state.isNight ? 0.15 : 0.7;
  const dirColor = state.isNight ? '#334488' : '#ffffee';
  const fogColor = state.isNight ? '#060a14' : '#0a0e1a';
  const groundColor = state.isNight ? '#050810' : '#0c1220';

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[25, 45, 25]}
        zoom={10}
        near={-1000}
        far={1000}
      />
      <CameraController stateRef={stateRef} />
      <GameLoop stateRef={stateRef} audioRef={audioRef} onStateChange={onStateChange} />

      <fog attach="fog" args={[fogColor, 50, 130]} />

      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[20, 40, 10]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {state.isNight && (
        <hemisphereLight args={['#112244', '#000011', 0.12]} />
      )}
      {state.isAirRaid && (
        <pointLight
          position={[0, 30, 0]}
          color="#ff2200"
          intensity={0.4 + Math.sin(Date.now() * 0.004) * 0.25}
          distance={120}
        />
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
