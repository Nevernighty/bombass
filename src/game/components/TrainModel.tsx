import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATIONS, toWorld } from '../constants';
import { getActiveLineStations, easeInOutQuad } from '../GameEngine';

interface TrainModelProps {
  trainId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

function TrainGLB({ lineColor }: { lineColor: string }) {
  const { scene } = useGLTF('/models/metro_wagon_type_d.glb');
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: lineColor,
          metalness: 0.6,
          roughness: 0.3,
        });
      }
    });
    return c;
  }, [scene, lineColor]);

  return <primitive object={cloned} scale={0.5} rotation={[0, Math.PI / 2, 0]} />;
}

function TrainFallback({ lineColor }: { lineColor: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[2.8, 0.8, 1.0]} />
        <meshStandardMaterial color={lineColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.5, 0.15, 0.9]} />
        <meshStandardMaterial color={lineColor} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Windows */}
      {[-0.7, -0.2, 0.3, 0.8].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.2, 0.51]}>
          <planeGeometry args={[0.35, 0.25]} />
          <meshBasicMaterial color="#88ccff" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function TrainModel({ trainId, stateRef, onClick }: TrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3(0, 0.7, 0));
  const smoothAngle = useRef<number | null>(null);
  const lastMovementAngle = useRef<number>(0);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;

  useFrame((_, delta) => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    const [wx, , wz] = toWorld(t.x, t.y);
    const targetPos = new THREE.Vector3(wx, 0.7, wz);

    // Smooth position interpolation to prevent teleportation
    const lerpFactor = Math.min(1, delta * 8);
    smoothPos.current.lerp(targetPos, lerpFactor);
    groupRef.current.position.copy(smoothPos.current);

    // Compute rotation only when actually moving
    if (!t.isDwelling) {
      const route = getActiveLineStations(state, t.line);
      if (route.length >= 2) {
        const curIdx = t.routeIndex;
        const nextIdx = Math.max(0, Math.min(route.length - 1, curIdx + t.direction));
        const curSt = STATIONS.find(s => s.id === route[curIdx]);
        const nextSt = STATIONS.find(s => s.id === route[nextIdx]);
        if (curSt && nextSt && curSt.id !== nextSt.id) {
          const [cx, , cz] = toWorld(curSt.x, curSt.y);
          const [nx, , nz] = toWorld(nextSt.x, nextSt.y);
          lastMovementAngle.current = Math.atan2(nx - cx, nz - cz);
        }
      }
    }

    // Smooth rotation
    const targetAngle = lastMovementAngle.current;
    if (smoothAngle.current === null) {
      smoothAngle.current = targetAngle;
    }
    let diff = targetAngle - smoothAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothAngle.current += diff * 0.12;
    groupRef.current.rotation.y = smoothAngle.current;

    // Dwell bob animation
    if (t.isDwelling) {
      groupRef.current.position.y = 0.7 + Math.sin(Date.now() * 0.005) * 0.05;
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
    >
      <Suspense fallback={<TrainFallback lineColor={lineColor} />}>
        <TrainGLB lineColor={lineColor} />
      </Suspense>

      {/* Selection ring */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.6, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#ffcc00' : '#ffffff'}
          transparent
          opacity={isSelected ? 0.5 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Passenger count */}
      {train.passengers.length > 0 && (
        <Billboard>
          <Text
            position={[0, 2, 0]}
            fontSize={0.55}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.06}
            outlineColor="#000000"
          >
            {`${train.passengers.length}/${train.capacity}`}
          </Text>
        </Billboard>
      )}

      {/* Headlights */}
      <pointLight color={lineColor} intensity={1.2} distance={5} position={[1.4, 0.2, 0]} />
      <pointLight color={lineColor} intensity={0.4} distance={3} position={[-1.4, 0.2, 0]} />
    </group>
  );
}

try { useGLTF.preload('/models/metro_wagon_type_d.glb'); } catch (e) {}
