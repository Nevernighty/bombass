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

function ProceduralTrain({ lineColor, fillRatio, isNight }: { lineColor: string; fillRatio: number; isNight: boolean }) {
  const capacityColor = fillRatio > 0.8 ? '#ff4444' : fillRatio > 0.4 ? '#ffaa00' : '#44ff44';
  const windowOpacity = isNight ? 0.9 : 0.6;
  const windowEmissive = isNight ? '#ffcc88' : '#88ccff';

  return (
    <group scale={[1.3, 1.3, 1.3]}>
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.9, 3.2]} />
        <meshStandardMaterial color={lineColor} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.0, 0.12, 3.0]} />
        <meshStandardMaterial color={lineColor} metalness={0.7} roughness={0.2} />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((zOff, i) => (
        <mesh key={`wl${i}`} position={[0.56, 0.15, zOff]}>
          <planeGeometry args={[0.01, 0.3]} />
          <meshStandardMaterial color={windowEmissive} emissive={windowEmissive} emissiveIntensity={isNight ? 1.5 : 0.3} transparent opacity={windowOpacity} />
        </mesh>
      ))}
      {[-0.9, -0.3, 0.3, 0.9].map((zOff, i) => (
        <mesh key={`wr${i}`} position={[-0.56, 0.15, zOff]}>
          <planeGeometry args={[0.01, 0.3]} />
          <meshStandardMaterial color={windowEmissive} emissive={windowEmissive} emissiveIntensity={isNight ? 1.5 : 0.3} transparent opacity={windowOpacity} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 1.6]}>
        <boxGeometry args={[0.9, 0.7, 0.05]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Headlights */}
      <mesh position={[0.25, 0.25, 1.63]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      <mesh position={[-0.25, 0.25, 1.63]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      {/* Capacity bar under train */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[1.12, 0.06, 3.0 * Math.max(0.1, fillRatio)]} />
        <meshStandardMaterial color={capacityColor} emissive={capacityColor} emissiveIntensity={0.5} transparent opacity={0.7} />
      </mesh>
      {/* Running lights on sides */}
      <mesh position={[0.57, 0, 1.0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.57, 0, 1.0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0.57, 0, -1.0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.57, 0, -1.0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.6} />
      </mesh>
      {/* Undercarriage */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.6, 0.12, 2.8]} />
        <meshStandardMaterial color="#222222" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.55, -0.9]}>
        <boxGeometry args={[0.8, 0.15, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.55, 0.9]}>
        <boxGeometry args={[0.8, 0.15, 0.5]} />
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
  const shieldMeshRef = useRef<THREE.Mesh>(null);
  const hoverGlowRef = useRef<THREE.Mesh>(null);
  const runLightLRef = useRef<THREE.Mesh>(null);
  const runLightRRef = useRef<THREE.Mesh>(null);
  const isHoveredRef = useRef(false);

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
          lastMovementAngle.current = Math.atan2(nx - cx, nz - cz);
        }
      }
    }

    const targetAngle = lastMovementAngle.current;
    if (smoothAngle.current === null) smoothAngle.current = targetAngle;
    let diff = targetAngle - smoothAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothAngle.current += diff * 0.25;
    groupRef.current.rotation.y = smoothAngle.current;

    if (t.isDwelling) {
      groupRef.current.position.y = 0.7 + Math.sin(Date.now() * 0.005) * 0.06;
    }

    // Running lights pulse
    if (runLightLRef.current && runLightRRef.current) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
      (runLightLRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      (runLightRRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Shield visual
    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = t.shieldTimer > 0;
      if (t.shieldTimer > 0) {
        (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(Date.now() * 0.004) * 0.08;
        shieldMeshRef.current.rotation.y += delta * 0.8;
      }
    }

    // Hover glow
    if (hoverGlowRef.current) {
      hoverGlowRef.current.visible = isHoveredRef.current;
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;
  const fillRatio = train.passengers.length / train.capacity;
  const isNight = stateRef.current.isNight;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
      onPointerEnter={() => { isHoveredRef.current = true; document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { isHoveredRef.current = false; document.body.style.cursor = 'default'; }}
    >
      <ProceduralTrain lineColor={lineColor} fillRatio={fillRatio} isNight={isNight} />

      {/* Hover glow ring */}
      <mesh ref={hoverGlowRef} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[2.2, 2.8, 16]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Running light meshes for animation */}
      <mesh ref={runLightLRef} position={[0.75, 0, 1.3]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.8} />
      </mesh>
      <mesh ref={runLightRRef} position={[-0.75, 0, 1.3]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.8} />
      </mesh>

      {/* Shield sphere */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[3.0, 12, 12]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.5, 20]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Passenger count label */}
      {train.passengers.length > 0 && (
        <Billboard>
          <Text
            position={[0, 2.0, 0]}
            fontSize={0.55}
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

      {/* Headlights + interior glow at night */}
      <pointLight color={isNight ? '#ffcc88' : lineColor} intensity={isNight ? 2.5 : 1.0} distance={isNight ? 10 : 5} position={[0, 0.3, 2.0]} />
      {isNight && <pointLight color="#ffaa66" intensity={0.6} distance={4} position={[0, 0.2, 0]} />}
    </group>
  );
}
