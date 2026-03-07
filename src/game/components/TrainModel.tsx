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

  return <primitive object={cloned} scale={0.4} rotation={[0, Math.PI / 2, 0]} />;
}

function TrainFallback({ lineColor }: { lineColor: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[2.5, 0.7, 0.9]} />
        <meshStandardMaterial color={lineColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.3, 0.15, 0.8]} />
        <meshStandardMaterial color={lineColor} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.15, 0.46]}>
        <boxGeometry args={[2.0, 0.3, 0.02]} />
        <meshStandardMaterial color="#88ccff" emissive="#88ccff" emissiveIntensity={0.3} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.15, -0.46]}>
        <boxGeometry args={[2.0, 0.3, 0.02]} />
        <meshStandardMaterial color="#88ccff" emissive="#88ccff" emissiveIntensity={0.3} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function TrainModel({ trainId, stateRef, onClick }: TrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevAngle = useRef<number | null>(null);
  const lastMovementAngle = useRef<number>(0);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;

  useFrame(() => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    const [wx, , wz] = toWorld(t.x, t.y);
    groupRef.current.position.set(wx, 0.6, wz);

    // Only compute rotation when NOT dwelling (moving between stations)
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
          const targetAngle = Math.atan2(nx - cx, nz - cz);
          lastMovementAngle.current = targetAngle;
        }
      }
    }

    // Smooth rotation toward last known movement angle
    const targetAngle = lastMovementAngle.current;
    if (prevAngle.current === null) {
      prevAngle.current = targetAngle;
    }
    let diff = targetAngle - prevAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    prevAngle.current += diff * 0.15;
    groupRef.current.rotation.y = prevAngle.current;

    // Dwell animation — gentle bob
    if (t.isDwelling) {
      groupRef.current.position.y = 0.6 + Math.sin(Date.now() * 0.006) * 0.06;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
    >
      <Suspense fallback={<TrainFallback lineColor={lineColor} />}>
        <TrainGLB lineColor={lineColor} />
      </Suspense>

      {/* Selection ring */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.5, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Passenger count - billboarded */}
      <Billboard>
        <Text
          position={[0, 1.8, 0]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {train.passengers.length > 0 ? `${train.passengers.length}/${train.capacity}` : ''}
        </Text>
      </Billboard>

      {/* Headlight */}
      <pointLight color={lineColor} intensity={1.5} distance={6} position={[1.3, 0.2, 0]} />
    </group>
  );
}

try { useGLTF.preload('/models/metro_wagon_type_d.glb'); } catch (e) {}
