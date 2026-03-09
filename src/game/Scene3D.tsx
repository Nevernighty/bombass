import React, { useRef, Suspense, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from './types';
import { updateGame, getActiveLineStations, getValidPendingTargets } from './GameEngine';
import { AudioEngine } from './AudioEngine';
import { STATIONS, toWorld, STATION_MAP } from './constants';
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
  const cinematicTimeRef = useRef(0);
  const autoPanRef = useRef<{ x: number; z: number; timer: number } | null>(null);

  useFrame((_, delta) => {
    const state = stateRef.current;
    const cam = state.camera;

    // WASD panning — faster response
    const panSpeed = 40 * delta / Math.max(cam.zoom, 0.3);
    const keys = cam.keysDown;
    if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) cam.targetY += panSpeed;
    if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) cam.targetY -= panSpeed;
    if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) cam.targetX += panSpeed;
    if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) cam.targetX -= panSpeed;

    // Any user input cancels auto-pan
    if (keys.size > 0) autoPanRef.current = null;

    // Auto-pan to explosions (only in free mode)
    if (cam.mode === 'free' && state.explosions.length > 0 && !autoPanRef.current) {
      const newest = state.explosions[state.explosions.length - 1];
      if (newest.time < 100) {
        const [ex, , ez] = toWorld(newest.x, newest.y);
        autoPanRef.current = { x: -ex, z: -ez, timer: 1.5 };
      }
    }
    if (autoPanRef.current) {
      autoPanRef.current.timer -= delta;
      if (autoPanRef.current.timer > 0) {
        const strength = Math.min(0.03, delta * 2);
        cam.targetX += (autoPanRef.current.x - cam.targetX) * strength;
        cam.targetY += (autoPanRef.current.z - cam.targetY) * strength;
      } else {
        autoPanRef.current = null;
      }
    }

    // Smoother interpolation — snappier
    const lerpFactor = 0.12;
    cam.zoom += (cam.targetZoom - cam.zoom) * lerpFactor;
    cam.x += (cam.targetX - cam.x) * lerpFactor;
    cam.y += (cam.targetY - cam.y) * lerpFactor;

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 10 * cam.zoom;
    ortho.updateProjectionMatrix();

    const orbitAngle = cam.orbitAngle;
    const tiltAngle = cam.tiltAngle;

    if (cam.mode === 'follow' && state.selectedTrain) {
      const train = state.trains.find(t => t.id === state.selectedTrain);
      if (train) {
        const [wx, , wz] = toWorld(train.x, train.y);
        cam.targetX = -wx;
        cam.targetY = -wz;
        cam.targetZoom += (1.5 - cam.targetZoom) * 0.03;
      }
    } else if (cam.mode === 'overview') {
      cam.targetX += (0 - cam.targetX) * 0.02;
      cam.targetY += (0 - cam.targetY) * 0.02;
      cam.targetZoom += (0.35 - cam.targetZoom) * 0.03;
    } else if (cam.mode === 'cinematic') {
      cinematicTimeRef.current += delta * cam.orbitSpeed;
      const t = cinematicTimeRef.current;
      const radius = 30;
      const cx = Math.sin(t) * radius;
      const cz = Math.sin(t * 2) * radius * 0.4;
      cam.targetX = -cx * 0.3;
      cam.targetY = -cz * 0.3;
      cam.targetZoom += (0.8 - cam.targetZoom) * 0.01;
    }

    // Apply orbit rotation + tilt
    const dist = 45;
    const baseX = Math.sin(orbitAngle) * dist * Math.cos(tiltAngle);
    const baseZ = Math.cos(orbitAngle) * dist * Math.cos(tiltAngle);
    const baseY = dist * Math.sin(tiltAngle);

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
    if (lastUpdateRef.current > 200) {
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
  const prevPendingRef = useRef('');
  const frameCountRef = useRef(0);
  const [activeStations, setActiveStations] = React.useState<string[]>(stateRef.current.activeStationIds);
  const [pendingStations, setPendingStations] = React.useState<string[]>([]);
  const [trainIds, setTrainIds] = React.useState<string[]>(stateRef.current.trains.map(t => t.id));
  const [droneIds, setDroneIds] = React.useState<string[]>([]);

  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current % 3 !== 0) return;

    const state = stateRef.current;
    const stKey = state.activeStationIds.join(',');
    if (stKey !== prevStationsRef.current) {
      prevStationsRef.current = stKey;
      setActiveStations([...state.activeStationIds]);
    }
    const pKey = state.pendingStations.join(',');
    if (pKey !== prevPendingRef.current) {
      prevPendingRef.current = pKey;
      setPendingStations([...state.pendingStations]);
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
        {/* Pending stations rendered as grey */}
        {pendingStations.map(id => (
          <StationNode3D key={`pending-${id}`} stationId={id} stateRef={stateRef} onClick={onStationClick} onHover={onStationHover} />
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

// Cloud layer using InstancedMesh
function CloudLayer({ isNight }: { isNight: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  const cloudData = useMemo(() => {
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 100,
        scale: 8 + Math.random() * 20,
        scaleY: 0.6,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
    return clouds;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    cloudData.forEach((c, i) => {
      const x = c.x + Math.sin(clock.elapsedTime * c.speed * 0.1) * 5;
      tempObj.position.set(x, 35, c.z);
      tempObj.rotation.set(-Math.PI / 2, 0, 0);
      tempObj.scale.set(c.scale, c.scale * c.scaleY, 1);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cloudData.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        color={isNight ? '#1a2040' : '#aabbcc'}
        emissive={isNight ? '#111133' : '#ddeeff'}
        emissiveIntensity={isNight ? 0.1 : 0.05}
        transparent
        opacity={isNight ? 0.15 : 0.12}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// Stars at night — imperative geometry to fix R3F bufferAttribute crash
function NightSky({ isNight }: { isNight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4;
      const r = 120;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }, [positions]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.002;
  });

  if (!isNight) return null;

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry ref={geoRef} />
        <pointsMaterial size={0.4} color="#ffffff" transparent opacity={0.6} sizeAttenuation={false} />
      </points>
      {/* Moon */}
      <mesh position={[60, 80, -40]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#e8e0d0" />
      </mesh>
      <pointLight position={[60, 80, -40]} color="#ccccdd" intensity={0.3} distance={200} />
    </>
  );
}

// Ambient fireflies at night — imperative geometry
function AmbientParticles({ isNight }: { isNight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const basePositions = useRef<Float32Array | null>(null);

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

  useEffect(() => {
    basePositions.current = new Float32Array(positions);
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geoRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
  }, [positions, colors]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !basePositions.current || !geoRef.current) return;
    const posAttr = geoRef.current.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;
    const base = basePositions.current;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, base[i * 3 + 1] + Math.sin(clock.elapsedTime * 0.5 + i) * 0.5);
    }
    posAttr.needsUpdate = true;
  });

  if (!isNight) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// Signal flare lines - pre-allocated pool
function SignalFlareLines({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const linesGroupRef = useRef<THREE.Group>(null);
  const linePool = useMemo(() => {
    const pool: THREE.Line[] = [];
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: '#ff4444', transparent: true, opacity: 0.4 });
      pool.push(new THREE.Line(geo, mat));
    }
    return pool;
  }, []);

  useFrame(() => {
    const state = stateRef.current;
    const visible = state.signalFlareTimer > 0;
    const activeDrones = visible ? state.drones.filter(d => !d.isDestroyed) : [];

    linePool.forEach((line, i) => {
      if (i < activeDrones.length && visible) {
        const d = activeDrones[i];
        const target = state.stations.find(s => s.id === d.targetStationId);
        if (target) {
          const [dx, , dz] = toWorld(d.x, d.y);
          const [tx, , tz] = toWorld(target.x, target.y);
          const posArr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
          posArr.setXYZ(0, dx, 3, dz);
          posArr.setXYZ(1, tx, 1, tz);
          posArr.needsUpdate = true;
          line.visible = true;
        } else {
          line.visible = false;
        }
      } else {
        line.visible = false;
      }
    });
  });

  return (
    <group ref={linesGroupRef}>
      {linePool.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// Tracer lines for SAM/AA fire
function TracerLinesLayer({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const linesGroupRef = useRef<THREE.Group>(null);
  const linePool = useMemo(() => {
    const pool: THREE.Line[] = [];
    for (let i = 0; i < 15; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: '#00ff88', transparent: true, opacity: 0.8, linewidth: 2 });
      pool.push(new THREE.Line(geo, mat));
    }
    return pool;
  }, []);

  useFrame(() => {
    const tracers = stateRef.current.tracerLines;
    linePool.forEach((line, i) => {
      if (i < tracers.length) {
        const t = tracers[i];
        const [fx, , fz] = toWorld(t.fromX, t.fromY);
        const [tx, , tz] = toWorld(t.toX, t.toY);
        const posArr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        posArr.setXYZ(0, fx, 2, fz);
        posArr.setXYZ(1, tx, 5, tz);
        posArr.needsUpdate = true;
        (line.material as THREE.LineBasicMaterial).opacity = t.timer / 500;
        (line.material as THREE.LineBasicMaterial).color.set(t.color);
        line.visible = true;
      } else {
        line.visible = false;
      }
    });
  });

  return (
    <group ref={linesGroupRef}>
      {linePool.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// Interceptor drone visuals
function InterceptorDronesLayer({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const meshesRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!meshesRef.current) return;
    const interceptors = stateRef.current.interceptorDrones;
    meshesRef.current.children.forEach((child, i) => {
      if (i < interceptors.length) {
        const iDrone = interceptors[i];
        const [wx, , wz] = toWorld(iDrone.x, iDrone.y);
        child.position.set(wx, 7, wz);
        child.visible = true;
        const target = stateRef.current.drones.find(d => d.id === iDrone.targetDroneId);
        if (target) {
          const [tx, , tz] = toWorld(target.x, target.y);
          child.lookAt(tx, 7, tz);
        }
      } else {
        child.visible = false;
      }
    });
  });

  return (
    <group ref={meshesRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} visible={false}>
          <mesh>
            <coneGeometry args={[0.3, 1.2, 6]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
          <pointLight color="#22c55e" intensity={0.5} distance={4} />
        </group>
      ))}
    </group>
  );
}

// Rain particle system — imperative geometry
function RainEffect({ isRaining }: { isRaining: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const count = 150;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return pos;
  }, []);

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }, [positions]);

  useFrame(() => {
    if (!pointsRef.current || !isRaining || !geoRef.current) return;
    const posAttr = geoRef.current.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;
    for (let i = 0; i < posAttr.count; i++) {
      let y = posAttr.getY(i) - 0.5;
      if (y < 0) y = 25 + Math.random() * 5;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  if (!isRaining) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial size={0.05} color="#8899bb" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// Clean ground — no ugly 2D map overlay
function GroundPlane({ isNight }: { isNight: boolean }) {
  const groundColor = isNight ? '#0e1428' : '#141c32';
  return (
    <>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <planeGeometry args={[240, 200]} />
        <meshStandardMaterial
          color={groundColor}
          metalness={0.05}
          roughness={0.95}
          emissive={isNight ? '#080c1a' : '#060a14'}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Subtle grid for spatial reference */}
      <gridHelper
        args={[200, 40, isNight ? '#1a2040' : '#1c2444', isNight ? '#141830' : '#181e38']}
        position={[0, -0.12, 0]}
      />
      {/* Left bank slightly different tone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, -0.1, 0]}>
        <planeGeometry args={[80, 180]} />
        <meshStandardMaterial color={isNight ? '#0c1225' : '#101828'} transparent opacity={0.4} />
      </mesh>
      {/* Right bank slightly different tone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.1, 0]}>
        <planeGeometry args={[80, 180]} />
        <meshStandardMaterial color={isNight ? '#0e1430' : '#121a30'} transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// Rubber-band line drawing visual
function DrawingLine({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const lineRef = useRef<THREE.Line>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
  }), []);
  
  // Raycaster for screen-to-ground conversion
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const mouseNDC = useMemo(() => new THREE.Vector2(), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const state = stateRef.current;
    const isDrawing = state.isDrawingLine && state.drawLineFrom && state.drawMouseWorldPos;
    
    if (lineRef.current) lineRef.current.visible = !!isDrawing;
    if (sphereRef.current) sphereRef.current.visible = !!isDrawing;
    
    if (!isDrawing || !lineRef.current || !sphereRef.current) return;
    
    const fromStation = state.stations.find(s => s.id === state.drawLineFrom);
    if (!fromStation) return;
    
    const [fx, , fz] = toWorld(fromStation.x, fromStation.y);
    
    // Convert screen mouse to world via raycasting onto ground plane
    const screenPos = state.drawMouseWorldPos!;
    mouseNDC.set(
      (screenPos.x / size.width) * 2 - 1,
      -(screenPos.z / size.height) * 2 + 1 // z stores clientY
    );
    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    const tx = intersectPoint.x;
    const tz = intersectPoint.z;
    
    // Rubbery wobble
    const t = Date.now() * 0.005;
    const wobbleX = Math.sin(t * 3) * 0.3;
    const wobbleZ = Math.cos(t * 2.5) * 0.3;
    
    // Update line geometry
    const posArr = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    posArr.setXYZ(0, fx, 1, fz);
    posArr.setXYZ(1, tx + wobbleX, 1, tz + wobbleZ);
    posArr.needsUpdate = true;
    
    // Update color
    const color = state.drawLineColor || '#9ca3af';
    lineMat.color.set(color);
    
    // Update endpoint sphere
    sphereRef.current.position.set(tx + wobbleX, 1, tz + wobbleZ);
    (sphereRef.current.material as THREE.MeshBasicMaterial).color.set(color);
    
    // Pulse the sphere
    const pulse = 0.8 + Math.sin(t * 4) * 0.3;
    sphereRef.current.scale.setScalar(pulse);
  });
  
  return (
    <>
      <primitive ref={lineRef} object={new THREE.Line(lineGeo, lineMat)} visible={false} renderOrder={999} />
      <mesh ref={sphereRef} visible={false} renderOrder={999}>
        <sphereGeometry args={[1.2, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthTest={false} />
      </mesh>
    </>
  );
}

function SceneContent({
  stateRef, audioRef, onStateChange,
  onStationClick, onTrainClick, onStationHover, onDroneClick,
}: SceneContentProps) {
  const state = stateRef.current;

  const ambientIntensity = state.isNight ? 0.5 : 0.55;
  const ambientColor = state.isNight ? '#4455aa' : '#e8e8ff';
  const dirIntensity = state.isNight ? 0.5 : 1.0;
  const dirColor = state.isNight ? '#6688cc' : '#ffffee';
  const fogColor = state.isNight ? '#0a1025' : '#0c1220';

  const skyHue = state.dayTime > 0.7 && state.dayTime < 0.85 ? '#2a1535' :
    state.dayTime > 0.15 && state.dayTime < 0.25 ? '#1a2545' :
    state.isNight ? '#050818' : '#1a3050';

  return (
    <>
      <OrthographicCamera makeDefault position={[25, 40, 25]} zoom={10} near={-1000} far={1000} />
      <CameraController stateRef={stateRef} />
      <GameLoop stateRef={stateRef} audioRef={audioRef} onStateChange={onStateChange} />

      <fog attach="fog" args={[fogColor, 90, 250]} />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={[20, 40, 10]} intensity={dirIntensity} color={dirColor} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
      <hemisphereLight args={[
        state.isNight ? '#223366' : '#87ceeb',
        state.isNight ? '#111122' : '#362907',
        state.isNight ? 0.3 : 0.15
      ]} />
      {state.isAirRaid && (
        <pointLight position={[0, 30, 0]} color="#ff2200" intensity={0.4 + Math.sin(Date.now() * 0.004) * 0.25} distance={120} />
      )}
      {state.isNight && (
        <>
          <pointLight position={[0, 8, 0]} color="#ff9933" intensity={0.5} distance={80} />
          <pointLight position={[-15, 6, 10]} color="#ffaa44" intensity={0.3} distance={70} />
        </>
      )}

      {/* Skybox sphere — reduced segments */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[200, 16, 8]} />
        <meshBasicMaterial color={skyHue} side={THREE.BackSide} transparent opacity={0.8} />
      </mesh>

      <NightSky isNight={state.isNight} />
      <GroundPlane isNight={state.isNight} />

      <RiverPlane />
      <CityBuildings stateRef={stateRef} />
      <CloudLayer isNight={state.isNight} />
      <AmbientParticles isNight={state.isNight} />
      <RainEffect isRaining={state.isRaining} />

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
      <TracerLinesLayer stateRef={stateRef} />
      <InterceptorDronesLayer stateRef={stateRef} />
      <DecoyMarkers stateRef={stateRef} />
      <ExplosionsLayer stateRef={stateRef} />
      <RepairUnitsLayer stateRef={stateRef} />
      <NotificationsLayer stateRef={stateRef} />
      <DrawingLine stateRef={stateRef} />
    </>
  );
}

export default SceneContent;
