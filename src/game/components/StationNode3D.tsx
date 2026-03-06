import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, GameStation } from '../types';
import { METRO_LINES, SHAPE_COLORS, toWorld, GAME_CONFIG } from '../constants';

interface StationNode3DProps {
  stationId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

function StationGeometry({ shape, size }: { shape: string; size: number }) {
  switch (shape) {
    case 'square':
      return <boxGeometry args={[size, size * 0.6, size]} />;
    case 'triangle':
      return <coneGeometry args={[size * 0.7, size, 3]} />;
    case 'diamond':
      return <octahedronGeometry args={[size * 0.7]} />;
    case 'star':
      return <dodecahedronGeometry args={[size * 0.7]} />;
    case 'circle':
    default:
      return <sphereGeometry args={[size * 0.6, 16, 16]} />;
  }
}

export function StationNode3D({ stationId, stateRef, onClick, onHover }: StationNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  const shieldRef = useRef<THREE.Mesh>(null);

  const station = useMemo(() => {
    return stateRef.current.stations.find(s => s.id === stationId);
  }, [stationId]);

  if (!station) return null;

  const [wx, , wz] = toWorld(station.x, station.y);
  const lineColor = METRO_LINES[station.line].color;

  useFrame((_, delta) => {
    const s = stateRef.current;
    const st = s.stations.find(ss => ss.id === stationId);
    if (!st || !groupRef.current) return;

    // Jelly wobble
    const jellyScaleX = 1 + Math.sin(st.jellyOffset.x * 0.5) * 0.15;
    const jellyScaleZ = 1 + Math.sin(st.jellyOffset.y * 0.5) * 0.15;
    const jellyScaleY = 1 + Math.sin((st.jellyOffset.x + st.jellyOffset.y) * 0.3) * 0.1;
    groupRef.current.scale.set(jellyScaleX, jellyScaleY, jellyScaleZ);

    const [px, , pz] = toWorld(st.x + st.jellyOffset.x * 0.001, st.y + st.jellyOffset.y * 0.001);
    groupRef.current.position.set(px, 0.5, pz);

    if (matRef.current) {
      if (st.isDestroyed) {
        matRef.current.color.set('#333333');
        matRef.current.emissive.set('#000000');
      } else if (st.isOnFire) {
        matRef.current.emissive.set('#ff4400');
        matRef.current.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      } else if (st.passengers.length >= st.maxPassengers - 1) {
        matRef.current.emissive.set('#ff0000');
        matRef.current.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
      } else {
        matRef.current.color.set(lineColor);
        matRef.current.emissive.set(lineColor);
        matRef.current.emissiveIntensity = s.isNight ? 0.4 : 0.15;
      }
    }

    if (fireRef.current) {
      fireRef.current.visible = st.isOnFire;
      if (st.isOnFire) {
        fireRef.current.intensity = 2 + Math.sin(Date.now() * 0.02) * 1;
      }
    }

    if (shieldRef.current) {
      shieldRef.current.visible = st.shieldTimer > 0;
      if (st.shieldTimer > 0) {
        (shieldRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.15 + Math.sin(Date.now() * 0.003) * 0.1;
        shieldRef.current.rotation.y += delta * 0.5;
      }
    }
  });

  const size = 1.4;

  return (
    <group
      ref={groupRef}
      position={[wx, 0.5, wz]}
      onClick={(e) => { e.stopPropagation(); onClick?.(stationId); }}
      onPointerEnter={() => onHover?.(stationId)}
      onPointerLeave={() => onHover?.(null)}
    >
      {/* Main station shape */}
      <mesh castShadow>
        <StationGeometry shape={station.shape} size={size} />
        <meshStandardMaterial
          ref={matRef}
          color={lineColor}
          emissive={lineColor}
          emissiveIntensity={0.15}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Transfer ring */}
      {station.isTransfer && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[size + 0.3, size + 0.6, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Anti-air indicator */}
      {station.hasAntiAir && (
        <mesh position={[0, size + 1, 0]}>
          <coneGeometry args={[0.3, 0.6, 4]} />
          <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Shield sphere */}
      <mesh ref={shieldRef} visible={false}>
        <sphereGeometry args={[size + 1.2, 16, 16]} />
        <meshBasicMaterial color="#3498db" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Fire light */}
      <pointLight ref={fireRef} color="#ff4400" intensity={0} distance={8} position={[0, 2, 0]} visible={false} />

      {/* Station name - billboarded so always faces camera */}
      <Billboard>
        <Text
          position={[0, size + 1.2, 0]}
          fontSize={0.45}
          color="#e0e0e0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="#000000"
          maxWidth={8}
        >
          {station.nameUa}
        </Text>
      </Billboard>

      {/* HP bar when damaged */}
      <Billboard>
        <mesh position={[0, size + 0.6, 0]}>
          <planeGeometry args={[2, 0.15]} />
          <meshBasicMaterial color="#333" transparent opacity={0.6} />
        </mesh>
      </Billboard>

      {/* Passenger indicators */}
      <PassengerIndicators stationId={stationId} stateRef={stateRef} radius={size + 0.6} />
    </group>
  );
}

function PassengerIndicators({ stationId, stateRef, radius }: { stationId: string; stateRef: React.MutableRefObject<GameState>; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = stateRef.current;
    const station = state.stations.find(s => s.id === stationId);
    if (!station || !groupRef.current) return;

    const children = groupRef.current.children;
    const maxShow = Math.min(station.passengers.length, 8);

    for (let i = 0; i < children.length; i++) {
      if (i < maxShow) {
        const angle = (i / maxShow) * Math.PI * 2 - Math.PI / 2;
        children[i].position.set(
          Math.cos(angle) * radius,
          0.3 + Math.sin(Date.now() * 0.003 + i) * 0.1,
          Math.sin(angle) * radius
        );
        children[i].visible = true;
        const p = station.passengers[i];
        if (p) {
          const color = SHAPE_COLORS[p.shape];
          ((children[i] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(color);
        }
      } else {
        children[i].visible = false;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}
