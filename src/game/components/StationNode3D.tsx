import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, toWorld, GAME_CONFIG } from '../constants';

interface StationNode3DProps {
  stationId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

function StationGeometry({ shape, size }: { shape: string; size: number }) {
  switch (shape) {
    case 'square':
      return <boxGeometry args={[size, size * 0.5, size]} />;
    case 'triangle':
      return <coneGeometry args={[size * 0.6, size * 0.8, 3]} />;
    case 'diamond':
      return <octahedronGeometry args={[size * 0.6]} />;
    case 'star':
      return <dodecahedronGeometry args={[size * 0.6]} />;
    case 'circle':
    default:
      return <sphereGeometry args={[size * 0.5, 12, 12]} />;
  }
}

export function StationNode3D({ stationId, stateRef, onClick, onHover }: StationNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const turretRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

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
    const jellyScaleX = 1 + Math.sin(st.jellyOffset.x * 0.5) * 0.12;
    const jellyScaleZ = 1 + Math.sin(st.jellyOffset.y * 0.5) * 0.12;
    const jellyScaleY = 1 + Math.sin((st.jellyOffset.x + st.jellyOffset.y) * 0.3) * 0.08;
    groupRef.current.scale.set(jellyScaleX, jellyScaleY, jellyScaleZ);

    const [px, , pz] = toWorld(st.x + st.jellyOffset.x * 0.001, st.y + st.jellyOffset.y * 0.001);
    groupRef.current.position.set(px, 0.4, pz);

    if (matRef.current) {
      if (st.isDestroyed) {
        matRef.current.color.set('#333333');
        matRef.current.emissive.set('#000000');
      } else if (st.isOnFire) {
        matRef.current.emissive.set('#ff4400');
        matRef.current.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      } else if (st.hp < st.maxHp) {
        const hpRatio = st.hp / st.maxHp;
        matRef.current.color.set(lineColor);
        matRef.current.emissive.set(hpRatio < 0.5 ? '#cc2200' : lineColor);
        matRef.current.emissiveIntensity = hpRatio < 0.5 ? 0.4 : 0.25;
      } else if (st.passengers.length >= st.maxPassengers - 1) {
        matRef.current.emissive.set('#ff0000');
        matRef.current.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
      } else {
        matRef.current.color.set(lineColor);
        matRef.current.emissive.set(lineColor);
        matRef.current.emissiveIntensity = s.isNight ? 1.0 : 0.25;
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
          0.15 + Math.sin(Date.now() * 0.003) * 0.08;
        shieldRef.current.rotation.y += delta * 0.5;
      }
    }

    // Turret rotation toward nearest drone
    if (turretRef.current && (st.hasAATurret || st.hasSAM)) {
      turretRef.current.visible = true;
      const nearestDrone = s.drones.filter(d => !d.isDestroyed).reduce((best, d) => {
        const ddx = st.x - d.x, ddy = st.y - d.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (!best || dist < best.dist) return { d, dist };
        return best;
      }, null as { d: any; dist: number } | null);
      if (nearestDrone && nearestDrone.dist < 0.2) {
        const [dx, , dz] = toWorld(nearestDrone.d.x, nearestDrone.d.y);
        const angle = Math.atan2(dx - px, dz - pz);
        turretRef.current.rotation.y += (angle - turretRef.current.rotation.y) * 0.1;
      }
    } else if (turretRef.current) {
      turretRef.current.visible = false;
    }

    // Pulse ring when passengers waiting
    if (pulseRef.current) {
      if (st.passengers.length > 0 && !st.isDestroyed) {
        pulseRef.current.visible = true;
        const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.15;
        pulseRef.current.scale.set(pulseScale, pulseScale, 1);
        (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.2 + (st.passengers.length / st.maxPassengers) * 0.3;
      } else {
        pulseRef.current.visible = false;
      }
    }
  });

  const size = 1.5;

  return (
    <group
      ref={groupRef}
      position={[wx, 0.4, wz]}
      onClick={(e) => { e.stopPropagation(); onClick?.(stationId); }}
      onPointerEnter={() => onHover?.(stationId)}
      onPointerLeave={() => onHover?.(null)}
    >
      {/* Pulse ring for waiting passengers */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} visible={false}>
        <ringGeometry args={[size * 1.0, size * 1.3, 24]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Platform ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[size * 0.7, size * 1.0, 24]} />
        <meshStandardMaterial
          color={lineColor}
          emissive={lineColor}
          emissiveIntensity={0.15}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main station shape */}
      <mesh castShadow>
        <StationGeometry shape={station.shape} size={size} />
        <meshStandardMaterial
          ref={matRef}
          color={lineColor}
          emissive={lineColor}
          emissiveIntensity={0.25}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Fortification walls */}
      {station.isFortified && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[size + 0.4, size + 0.7, 8]} />
          <meshStandardMaterial color="#555555" emissive="#333333" emissiveIntensity={0.1} metalness={0.5} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Transfer ring */}
      {station.isTransfer && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[size + 0.2, size + 0.4, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* AA turret / SAM visual */}
      <group ref={turretRef} position={[0, size + 0.3, 0]} visible={false}>
        {/* Turret base */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.3, 0.3, 6]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Turret barrel */}
        <mesh position={[0, 0.1, 0.3]} rotation={[-Math.PI / 6, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 4]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Anti-air indicator (old style) */}
      {station.hasAntiAir && !station.hasAATurret && !station.hasSAM && (
        <mesh position={[0, size + 0.8, 0]}>
          <coneGeometry args={[0.25, 0.5, 4]} />
          <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Shelter dome */}
      {station.isSheltering && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[size + 0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#4488aa" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Shield sphere */}
      <mesh ref={shieldRef} visible={false}>
        <sphereGeometry args={[size + 1, 12, 12]} />
        <meshBasicMaterial color="#3498db" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Fire light */}
      <pointLight ref={fireRef} color="#ff4400" intensity={0} distance={6} position={[0, 1.5, 0]} visible={false} />

      {/* Station name */}
      <Billboard>
        <Text
          position={[0, size + 1.8, 0]}
          fontSize={0.42}
          color="#e0e0e0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="#000000"
          maxWidth={7}
        >
          {station.nameUa}
        </Text>
      </Billboard>

      {/* Passenger count */}
      <Billboard>
        <Text
          position={[0, size + 1.3, 0]}
          fontSize={0.35}
          color={station.passengers.length >= station.maxPassengers - 1 ? '#ff4444' : '#ffcc00'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {station.passengers.length > 0 ? `${station.passengers.length}/${station.maxPassengers}` : ''}
        </Text>
      </Billboard>

      {/* HP bar when damaged */}
      {station.hp < station.maxHp && !station.isDestroyed && (
        <Billboard>
          <mesh position={[0, size + 0.9, 0]}>
            <planeGeometry args={[2, 0.15]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.7} />
          </mesh>
          <mesh position={[(station.hp / station.maxHp - 1) * 1, size + 0.9, 0.01]}>
            <planeGeometry args={[2 * (station.hp / station.maxHp), 0.12]} />
            <meshBasicMaterial color={station.hp / station.maxHp > 0.5 ? '#22c55e' : '#ef4444'} />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}
