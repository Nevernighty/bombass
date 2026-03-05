import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, toWorld, GAME_CONFIG } from '../constants';
import { getActiveLineStations, easeInOutQuad } from '../GameEngine';

interface TrainModelProps {
  trainId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

function TrainGLB({ trainId, stateRef, lineColor }: { trainId: string; stateRef: React.MutableRefObject<GameState>; lineColor: string }) {
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

  return <primitive object={cloned} scale={0.3} rotation={[0, Math.PI / 2, 0]} />;
}

function TrainFallback({ lineColor }: { lineColor: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[2.5, 0.7, 0.9]} />
        <meshStandardMaterial color={lineColor} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.3, 0.15, 0.8]} />
        <meshStandardMaterial color={lineColor} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Windows */}
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
  const prevAngle = useRef(0);
  const textRef = useRef<any>(null);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;

  useFrame(() => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    // World position
    const [wx, , wz] = toWorld(t.x, t.y);
    groupRef.current.position.set(wx, 0.8, wz);

    // Calculate facing direction from movement
    const route = getActiveLineStations(state, t.line);
    if (route.length >= 2) {
      const curIdx = t.routeIndex;
      const nextIdx = Math.max(0, Math.min(route.length - 1, curIdx + t.direction));
      const curSt = state.stations.find(s => s.id === route[curIdx]);
      const nextSt = state.stations.find(s => s.id === route[nextIdx]);
      if (curSt && nextSt && (curSt.x !== nextSt.x || curSt.y !== nextSt.y)) {
        const [cx, , cz] = toWorld(curSt.x, curSt.y);
        const [nx, , nz] = toWorld(nextSt.x, nextSt.y);
        const targetAngle = Math.atan2(nx - cx, nz - cz);
        // Smooth rotation
        prevAngle.current += (targetAngle - prevAngle.current) * 0.1;
        groupRef.current.rotation.y = prevAngle.current;
      }
    }

    // Dwell animation - bob up/down
    if (t.isDwelling) {
      groupRef.current.position.y = 0.8 + Math.sin(Date.now() * 0.008) * 0.1;
      groupRef.current.scale.set(1, 1 + Math.sin(Date.now() * 0.01) * 0.05, 1);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }

    // Passenger count text
    if (textRef.current) {
      textRef.current.text = t.passengers.length > 0 ? `${t.passengers.length}` : '';
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
    >
      <Suspense fallback={<TrainFallback lineColor={lineColor} />}>
        <TrainFallback lineColor={lineColor} />
      </Suspense>

      {/* Selection indicator */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.5, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Passenger count */}
      <Text
        ref={textRef}
        position={[0, 1.5, 0]}
        fontSize={0.6}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.06}
        outlineColor="#000000"
      >
        {''}
      </Text>

      {/* Headlight */}
      <pointLight color={lineColor} intensity={1} distance={5} position={[1.3, 0.2, 0]} />
    </group>
  );
}

// Preload attempt (won't crash if file missing)
try { useGLTF.preload('/models/metro_wagon_type_d.glb'); } catch (e) {}
