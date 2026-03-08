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

// Fire particle system
function FireParticles({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !active) return;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const t = clock.elapsedTime * 3 + i * 1.2;
      mesh.position.y = 0.5 + ((t % 2) * 1.2);
      mesh.position.x = Math.sin(t * 1.5 + i) * 0.4;
      mesh.position.z = Math.cos(t * 1.3 + i * 0.7) * 0.4;
      const scale = 0.15 - ((t % 2) / 2) * 0.12;
      mesh.scale.setScalar(Math.max(0.03, scale));
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1 - (t % 2) / 2;
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#ff6600' : '#ffaa00'} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Passenger orbit dots
function PassengerOrbit({ count, lineColor, maxPassengers }: { count: number; lineColor: string; maxPassengers: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const shown = Math.min(count, 6);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const speed = 0.8 + (i / shown) * 0.5;
      const angle = clock.elapsedTime * speed + (i / shown) * Math.PI * 2;
      const radius = 2.2 + i * 0.15;
      child.position.x = Math.cos(angle) * radius;
      child.position.z = Math.sin(angle) * radius;
      child.position.y = 0.3 + Math.sin(clock.elapsedTime * 2 + i) * 0.15;
    });
  });

  if (count === 0) return null;
  const fillRatio = count / maxPassengers;
  const dotColor = fillRatio > 0.8 ? '#ff4444' : fillRatio > 0.5 ? '#ffaa00' : lineColor;

  return (
    <group ref={groupRef}>
      {Array.from({ length: shown }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color={dotColor} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function StationNode3D({ stationId, stateRef, onClick, onHover }: StationNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const turretRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);
  const isHoveredRef = useRef(false);
  const hoverScaleRef = useRef(1);

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

    // Hover scale smoothing
    const targetScale = isHoveredRef.current ? 1.15 : 1;
    hoverScaleRef.current += (targetScale - hoverScaleRef.current) * 0.15;

    // Jelly wobble
    const jellyScaleX = hoverScaleRef.current * (1 + Math.sin(st.jellyOffset.x * 0.5) * 0.12);
    const jellyScaleZ = hoverScaleRef.current * (1 + Math.sin(st.jellyOffset.y * 0.5) * 0.12);
    const jellyScaleY = hoverScaleRef.current * (1 + Math.sin((st.jellyOffset.x + st.jellyOffset.y) * 0.3) * 0.08);
    groupRef.current.scale.set(jellyScaleX, jellyScaleY, jellyScaleZ);

    const [px, , pz] = toWorld(st.x + st.jellyOffset.x * 0.001, st.y + st.jellyOffset.y * 0.001);
    groupRef.current.position.set(px, 0.4, pz);

    if (matRef.current) {
      const emissiveBoost = isHoveredRef.current ? 0.3 : 0;
      if (st.isDestroyed) {
        matRef.current.color.set('#333333');
        matRef.current.emissive.set('#000000');
      } else if (st.isOnFire) {
        matRef.current.emissive.set('#ff4400');
        matRef.current.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3 + emissiveBoost;
      } else if (st.hp < st.maxHp) {
        const hpRatio = st.hp / st.maxHp;
        matRef.current.color.set(lineColor);
        matRef.current.emissive.set(hpRatio < 0.5 ? '#cc2200' : lineColor);
        matRef.current.emissiveIntensity = (hpRatio < 0.5 ? 0.4 : 0.25) + emissiveBoost;
      } else if (st.passengers.length >= st.maxPassengers - 1) {
        matRef.current.emissive.set('#ff0000');
        matRef.current.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2 + emissiveBoost;
      } else {
        matRef.current.color.set(lineColor);
        matRef.current.emissive.set(lineColor);
        matRef.current.emissiveIntensity = (s.isNight ? 1.0 : 0.25) + emissiveBoost;
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
        const fillRatio = st.passengers.length / st.maxPassengers;
        const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.15;
        pulseRef.current.scale.set(pulseScale, pulseScale, 1);
        (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + fillRatio * 0.4;
      } else {
        pulseRef.current.visible = false;
      }
    }

    // Selection ring expand animation
    if (selectRingRef.current) {
      const isSelected = s.hoveredStation === stationId;
      selectRingRef.current.visible = isSelected;
      if (isSelected) {
        const t = Date.now() * 0.003;
        const ringScale = 1 + Math.sin(t) * 0.08;
        selectRingRef.current.scale.set(ringScale, ringScale, 1);
        (selectRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t * 2) * 0.15;
        selectRingRef.current.rotation.z += delta * 0.3;
      }
    }
  });

  const size = 2.5;

  return (
    <group
      ref={groupRef}
      position={[wx, 0.4, wz]}
      onClick={(e) => { e.stopPropagation(); onClick?.(stationId); }}
      onPointerEnter={() => { isHoveredRef.current = true; onHover?.(stationId); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { isHoveredRef.current = false; onHover?.(null); document.body.style.cursor = 'default'; }}
    >
      {/* Selection ring */}
      <mesh ref={selectRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} visible={false}>
        <ringGeometry args={[size * 1.4, size * 1.7, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

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
          emissiveIntensity={0.25}
          transparent
          opacity={0.8}
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
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Passenger orbit dots */}
      <PassengerOrbit count={station.passengers.length} lineColor={lineColor} maxPassengers={station.maxPassengers} />

      {/* Fire particles */}
      <FireParticles active={station.isOnFire} />

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
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.3, 0.3, 6]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.7} roughness={0.3} />
        </mesh>
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
          position={[0, size + 2.0, 0]}
          fontSize={0.65}
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
          position={[0, size + 1.5, 0]}
          fontSize={0.4}
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
          <mesh position={[0, size + 1.1, 0]}>
            <planeGeometry args={[2.5, 0.2]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.7} />
          </mesh>
          <mesh position={[(station.hp / station.maxHp - 1) * 1.25, size + 1.1, 0.01]}>
            <planeGeometry args={[2.5 * (station.hp / station.maxHp), 0.16]} />
            <meshBasicMaterial color={station.hp / station.maxHp > 0.5 ? '#22c55e' : '#ef4444'} />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}
