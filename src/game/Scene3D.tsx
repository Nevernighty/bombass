import React, { useRef, Suspense, useMemo } from 'react';
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
import { DecoyMarkers } from './components/DecoyMarkers';

interface SceneContentProps {
  stateRef: React.MutableRefObject<GameState>;
  audioRef: React.MutableRefObject<AudioEngine>;
  onStateChange: (state: GameState) => void;
  onStationClick: (id: string) => void;
  onTrainClick: (id: string) => void;
  onStationHover: (id: string | null) => void;
  onDroneClick?: (id: string) => void;
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

function DynamicEntities({ stateRef, onStationClick, onTrainClick, onStationHover, onDroneClick }: {
  stateRef: React.MutableRefObject<GameState>;
  onStationClick: (id: string) => void;
  onTrainClick: (id: string) => void;
  onStationHover: (id: string | null) => void;
  onDroneClick?: (id: string) => void;
}) {
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
      <group>
        {activeStations.map(id => (
          <StationNode3D key={id} stationId={id} stateRef={stateRef} onClick={onStationClick} onHover={onStationHover} />
        ))}
      </group>
      <group>
        {trainIds.map(id => (
          <TrainModel key={id} trainId={id} stateRef={stateRef} onClick={onTrainClick} />
        ))}
      </group>
      <group>
        {droneIds.map(id => (
          <DroneModel key={id} droneId={id} stateRef={stateRef} onClick={onDroneClick} />
        ))}
      </group>
    </>
  );
}

// Cloud layer for atmosphere
function CloudLayer({ isNight }: { isNight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const cloudData = useMemo(() => {
    const clouds = [];
    for (let i = 0; i < 10; i++) {
      clouds.push({
        x: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 100,
        scale: 8 + Math.random() * 20,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
    return clouds;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const cd = cloudData[i];
      if (cd) {
        child.position.x = cd.x + Math.sin(clock.elapsedTime * cd.speed * 0.1) * 5;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {cloudData.map((c, i) => (
        <mesh key={i} position={[c.x, 35, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[c.scale, c.scale * 0.6]} />
          <meshStandardMaterial
            color={isNight ? '#1a2040' : '#aabbcc'}
            emissive={isNight ? '#111133' : '#ddeeff'}
            emissiveIntensity={isNight ? 0.1 : 0.05}
            transparent
            opacity={isNight ? 0.15 : 0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Ambient particles (fireflies at night)
function AmbientParticles({ isNight }: { isNight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 40;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = 1 + Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      const c = new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.6);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, posAttr.getY(i) + Math.sin(clock.elapsedTime + i) * 0.003);
    }
    posAttr.needsUpdate = true;
  });

  if (!isNight) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// Signal flare lines from drones to targets
function SignalFlareLines({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const linesRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = React.useState(false);

  useFrame(() => {
    setVisible(stateRef.current.signalFlareTimer > 0);
  });

  if (!visible) return null;

  const state = stateRef.current;
  return (
    <group ref={linesRef}>
      {state.drones.filter(d => !d.isDestroyed).map(d => {
        const target = state.stations.find(s => s.id === d.targetStationId);
        if (!target) return null;
        const [dx, , dz] = toWorld(d.x, d.y);
        const [tx, , tz] = toWorld(target.x, target.y);
        const points = [new THREE.Vector3(dx, 3, dz), new THREE.Vector3(tx, 1, tz)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <primitive key={d.id} object={new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ff4444', transparent: true, opacity: 0.4 }))} />
        );
      })}
    </group>
  );
}

function SceneContent({
  stateRef, audioRef, onStateChange,
  onStationClick, onTrainClick, onStationHover, onDroneClick,
}: SceneContentProps) {
  const state = stateRef.current;

  const ambientIntensity = state.isNight ? 0.35 : 0.5;
  const ambientColor = state.isNight ? '#4455aa' : '#e8e8ff';
  const dirIntensity = state.isNight ? 0.3 : 0.7;
  const dirColor = state.isNight ? '#6688cc' : '#ffffee';
  const fogColor = state.isNight ? '#0a1025' : '#0a0e1a';
  const groundColor = state.isNight ? '#0a1025' : '#0c1220';

  // Skybox gradient colors
  const skyTop = state.isNight ? '#050818' : '#1a3050';
  const skyHorizon = state.isNight ? '#1a1530' : '#4a6080';

  return (
    <>
      <OrthographicCamera makeDefault position={[25, 45, 25]} zoom={10} near={-1000} far={1000} />
      <CameraController stateRef={stateRef} />
      <GameLoop stateRef={stateRef} audioRef={audioRef} onStateChange={onStateChange} />

      <fog attach="fog" args={[fogColor, 80, 180]} />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={[20, 40, 10]} intensity={dirIntensity} color={dirColor} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={[
        state.isNight ? '#223366' : '#87ceeb',
        state.isNight ? '#111122' : '#362907',
        state.isNight ? 0.25 : 0.15
      ]} />
      {state.isAirRaid && (
        <pointLight position={[0, 30, 0]} color="#ff2200" intensity={0.4 + Math.sin(Date.now() * 0.004) * 0.25} distance={120} />
      )}
      {state.isNight && (
        <>
          <pointLight position={[0, 8, 0]} color="#ff9933" intensity={0.3} distance={80} />
          <pointLight position={[-20, 5, -10]} color="#ffaa44" intensity={0.15} distance={50} />
          <pointLight position={[15, 5, 15]} color="#ffaa44" intensity={0.15} distance={50} />
        </>
      )}

      {/* Skybox gradient dome */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[120, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={skyTop} side={THREE.BackSide} transparent opacity={0.8} />
      </mesh>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[160, 130]} />
        <meshStandardMaterial color={groundColor} metalness={0.05} roughness={0.95} />
      </mesh>
      <gridHelper args={[160, 32, '#121a30', '#121a30']} position={[0, 0.01, 0]} />

      <RiverPlane />
      <CityBuildings stateRef={stateRef} />
      <CloudLayer isNight={state.isNight} />
      <AmbientParticles isNight={state.isNight} />

      <MetroLine3D line="red" stateRef={stateRef} />
      <MetroLine3D line="blue" stateRef={stateRef} />
      <MetroLine3D line="green" stateRef={stateRef} />

      <DynamicEntities
        stateRef={stateRef}
        onStationClick={onStationClick}
        onTrainClick={onTrainClick}
        onStationHover={onStationHover}
        onDroneClick={onDroneClick}
      />

      <SignalFlareLines stateRef={stateRef} />
      <DecoyMarkers stateRef={stateRef} />
      <ExplosionsLayer stateRef={stateRef} />
      <RepairUnitsLayer stateRef={stateRef} />
      <NotificationsLayer stateRef={stateRef} />
    </>
  );
}

export default SceneContent;
