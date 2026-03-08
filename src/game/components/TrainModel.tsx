import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface TrainModelProps {
  trainId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

// Procedural metro wagon — much lighter than GLB, always correct orientation
function ProceduralTrain({ lineColor }: { lineColor: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[3.2, 0.9, 1.1]} />
        <meshStandardMaterial color={lineColor} metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[3.0, 0.12, 1.0]} />
        <meshStandardMaterial color={lineColor} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Windows - left */}
      {[-0.9, -0.3, 0.3, 0.9].map((xOff, i) => (
        <mesh key={`wl${i}`} position={[xOff, 0.15, 0.56]}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshBasicMaterial color="#88ccff" transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Windows - right */}
      {[-0.9, -0.3, 0.3, 0.9].map((xOff, i) => (
        <mesh key={`wr${i}`} position={[xOff, 0.15, -0.56]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshBasicMaterial color="#88ccff" transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Front face */}
      <mesh position={[1.6, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.7, 0.9]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Headlight */}
      <mesh position={[1.63, 0.25, 0.25]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      <mesh position={[1.63, 0.25, -0.25]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      {/* Undercarriage */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[2.8, 0.12, 0.6]} />
        <meshStandardMaterial color="#222222" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Bogies */}
      <mesh position={[-0.9, -0.55, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.9, -0.55, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>
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

    const lerpFactor = Math.min(1, delta * 8);
    smoothPos.current.lerp(targetPos, lerpFactor);
    groupRef.current.position.copy(smoothPos.current);

    // Compute rotation only when moving
    if (!t.isDwelling) {
      const route = getActiveLineStations(state, t.line);
      if (route.length >= 2) {
        const curIdx = t.routeIndex;
        const nextIdx = Math.max(0, Math.min(route.length - 1, curIdx + t.direction));
        const curSt = STATION_MAP.get(route[curIdx]);
        const nextSt = STATION_MAP.get(route[nextIdx]);
        if (curSt && nextSt && curSt.id !== nextSt.id) {
          const [cx, , cz] = toWorld(curSt.x, curSt.y);
          const [nx, , nz] = toWorld(nextSt.x, nextSt.y);
          // atan2 for facing direction along travel
          lastMovementAngle.current = Math.atan2(nx - cx, nz - cz);
        }
      }
    }

    // Smooth rotation
    const targetAngle = lastMovementAngle.current;
    if (smoothAngle.current === null) smoothAngle.current = targetAngle;
    let diff = targetAngle - smoothAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothAngle.current += diff * 0.15;
    groupRef.current.rotation.y = smoothAngle.current;

    // Dwell bob
    if (t.isDwelling) {
      groupRef.current.position.y = 0.7 + Math.sin(Date.now() * 0.005) * 0.04;
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
    >
      <ProceduralTrain lineColor={lineColor} />

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 2.0, 20]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Passenger count label */}
      {train.passengers.length > 0 && (
        <Billboard>
          <Text
            position={[0, 1.6, 0]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {`${train.passengers.length}/${train.capacity}`}
          </Text>
        </Billboard>
      )}

      {/* Headlights */}
      <pointLight color={lineColor} intensity={1.0} distance={4} position={[1.6, 0.3, 0]} />
    </group>
  );
}
