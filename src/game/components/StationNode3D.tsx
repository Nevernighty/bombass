import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, toWorld, GAME_CONFIG } from '../constants';
import { getValidPendingTargets } from '../GameEngine';

interface StationNode3DProps {
  stationId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

function StationGeometry({ shape, size }: { shape: string; size: number }) {
  switch (shape) {
    case 'square': return <boxGeometry args={[size, size * 0.5, size]} />;
    case 'triangle': return <coneGeometry args={[size * 0.6, size * 0.8, 3]} />;
    case 'diamond': return <octahedronGeometry args={[size * 0.6]} />;
    case 'star': return <dodecahedronGeometry args={[size * 0.6]} />;
    default: return <sphereGeometry args={[size * 0.5, 12, 12]} />;
  }
}

function PassengerShape3D({ shape, color, position }: { shape: string; color: string; position: [number, number, number] }) {
  return (
    <mesh position={position} scale={[0.25, 0.25, 0.25]}>
      {shape === 'circle' && <sphereGeometry args={[1, 6, 6]} />}
      {shape === 'square' && <boxGeometry args={[1.4, 1.4, 1.4]} />}
      {shape === 'triangle' && <coneGeometry args={[0.8, 1.4, 3]} />}
      {shape === 'diamond' && <octahedronGeometry args={[0.8]} />}
      {shape === 'star' && <dodecahedronGeometry args={[0.8]} />}
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

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

function PassengerQueue({ stationId, stateRef, isPending }: { stationId: string; stateRef: React.MutableRefObject<GameState>; isPending: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const prevCountRef = useRef(0);
  useFrame(() => {
    if (!groupRef.current) return;
    const st = stateRef.current.stations.find(s => s.id === stationId);
    if (!st) return;
    const count = st.passengers.length;
    if (count === prevCountRef.current) return;
    prevCountRef.current = count;
  });
  const state = stateRef.current;
  const st = state.stations.find(s => s.id === stationId);
  if (!st || st.passengers.length === 0) return null;

  const lineColor = isPending ? '#666666' : METRO_LINES[st.line].color;
  const maxShow = Math.min(st.passengers.length, 8);
  const fillRatio = st.passengers.length / st.maxPassengers;
  const queueColor = fillRatio > 0.8 ? '#ef4444' : fillRatio > 0.5 ? '#f59e0b' : lineColor;

  return (
    <group ref={groupRef}>
      {st.passengers.slice(0, maxShow).map((p, i) => {
        const angle = (i / maxShow) * Math.PI * 1.5 - Math.PI * 0.25;
        const radius = 3.0 + i * 0.3;
        return (
          <PassengerShape3D key={p.id} shape={p.shape} color={queueColor}
            position={[Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius]} />
        );
      })}
      {st.passengers.length > maxShow && (
        <Billboard position={[4, 1.5, 0]}>
          <Text fontSize={0.4} color={queueColor} anchorX="center" outlineWidth={0.03} outlineColor="#000">
            +{st.passengers.length - maxShow}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// Anti-Air Turret — Tower Defense style
function AATurret({ station, stateRef }: { station: any; stateRef: React.MutableRefObject<GameState> }) {
  const headRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.PointLight>(null);
  const radarRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const st = s.stations.find((ss: any) => ss.id === station.id);
    if (!st || !headRef.current) return;

    // Find nearest drone
    const nearestDrone = s.drones.filter(d => !d.isDestroyed).reduce((best, d) => {
      const ddx = st.x - d.x, ddy = st.y - d.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (!best || dist < best.dist) return { d, dist };
      return best;
    }, null as { d: any; dist: number } | null);

    if (nearestDrone && nearestDrone.dist < 0.2) {
      const [dx, , dz] = toWorld(nearestDrone.d.x, nearestDrone.d.y);
      const [sx, , sz] = toWorld(st.x, st.y);
      const targetAngle = Math.atan2(dx - sx, dz - sz);
      // Smooth lerp to target
      const current = headRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      headRef.current.rotation.y += diff * 0.15;
    } else {
      // Slow scan
      headRef.current.rotation.y += delta * 0.4;
    }

    // Muzzle flash when turret/SAM cooldown is recovering
    if (flashRef.current) {
      const isFiring = (st.turretCooldown > 0 && st.turretCooldown < 300) || (st.samCooldown > 0 && st.samCooldown < 300);
      flashRef.current.intensity = isFiring ? 4 + Math.random() * 2 : 0;
    }

    // Radar spin
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 3;
    }
  });

  const hasSAM = station.hasSAM;
  const baseHeight = hasSAM ? 0.6 : 0.4;

  return (
    <group position={[0, 2.8, 0]}>
      {/* Base cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.6, baseHeight, 8]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ring detail */}
      <mesh position={[0, baseHeight * 0.3, 0]}>
        <torusGeometry args={[0.52, 0.04, 8, 16]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Rotating head */}
      <group ref={headRef} position={[0, baseHeight * 0.5, 0]}>
        {/* Housing */}
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <meshStandardMaterial color="#333344" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Twin barrels */}
        <mesh position={[0.12, 0.02, 0.4]} rotation={[-Math.PI / 8, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#222233" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[-0.12, 0.02, 0.4]} rotation={[-Math.PI / 8, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#222233" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Muzzle flash */}
        <pointLight ref={flashRef} color="#ffaa44" intensity={0} distance={8} position={[0, 0.05, 0.8]} />

        {/* SAM missile tubes */}
        {hasSAM && (
          <group position={[0, 0.2, -0.1]}>
            {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
              <mesh key={i} position={[x, 0, 0]} rotation={[-Math.PI / 5, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 6]} />
                <meshStandardMaterial color="#1a2a1a" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* Radar dish on top */}
      {(hasSAM || station.hasAntiAir) && (
        <mesh ref={radarRef} position={[0, baseHeight * 0.5 + 0.3, 0]}>
          <cylinderGeometry args={[0.2, 0.02, 0.04, 8]} />
          <meshStandardMaterial color="#4488aa" emissive="#3388aa" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

export function StationNode3D({ stationId, stateRef, onClick, onHover }: StationNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const platformMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);
  const pendingRingRef = useRef<THREE.Mesh>(null);
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

    const isPending = s.pendingStations.includes(stationId);
    const isValidTarget = isPending && s.isDrawingLine && s.drawLineFrom
      ? getValidPendingTargets(s, s.drawLineFrom).includes(stationId) : false;
    const effectiveColor = isPending ? '#666666' : lineColor;

    // Hover scale
    const targetScale = isHoveredRef.current ? 1.25 : 1;
    hoverScaleRef.current += (targetScale - hoverScaleRef.current) * (1 - Math.exp(-12 * delta));

    const jellyScaleX = hoverScaleRef.current * (1 + Math.sin(st.jellyOffset.x * 0.5) * 0.12);
    const jellyScaleZ = hoverScaleRef.current * (1 + Math.sin(st.jellyOffset.y * 0.5) * 0.12);
    const jellyScaleY = hoverScaleRef.current * (1 + Math.sin((st.jellyOffset.x + st.jellyOffset.y) * 0.3) * 0.08);
    groupRef.current.scale.set(jellyScaleX, jellyScaleY, jellyScaleZ);

    const [px, , pz] = toWorld(st.x + st.jellyOffset.x * 0.001, st.y + st.jellyOffset.y * 0.001);
    groupRef.current.position.set(px, 0.4, pz);

    // Main material
    if (matRef.current) {
      const emissiveBoost = isHoveredRef.current ? 0.4 : 0;
      if (isPending) {
        matRef.current.color.set('#555555');
        matRef.current.emissive.set('#333333');
        matRef.current.emissiveIntensity = 0.15 + Math.sin(Date.now() * 0.003) * 0.1 + emissiveBoost;
      } else if (st.isDestroyed) {
        matRef.current.color.set('#333333');
        matRef.current.emissive.set('#000000');
      } else if (st.isOnFire) {
        matRef.current.emissive.set('#ff4400');
        matRef.current.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3 + emissiveBoost;
      } else if (st.hp < st.maxHp) {
        const hpRatio = st.hp / st.maxHp;
        matRef.current.color.set(effectiveColor);
        matRef.current.emissive.set(hpRatio < 0.5 ? '#cc2200' : effectiveColor);
        matRef.current.emissiveIntensity = (hpRatio < 0.5 ? 0.4 : 0.25) + emissiveBoost;
      } else if (st.passengers.length >= st.maxPassengers - 1) {
        matRef.current.emissive.set('#ff0000');
        matRef.current.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2 + emissiveBoost;
      } else {
        matRef.current.color.set(effectiveColor);
        matRef.current.emissive.set(effectiveColor);
        matRef.current.emissiveIntensity = (s.isNight ? 1.0 : 0.25) + emissiveBoost;
      }
    }

    // Platform ring color — grey for pending
    if (platformMatRef.current) {
      platformMatRef.current.color.set(effectiveColor);
      platformMatRef.current.emissive.set(effectiveColor);
      platformMatRef.current.emissiveIntensity = isPending ? 0.1 : 0.25;
    }

    if (fireRef.current) {
      fireRef.current.visible = st.isOnFire;
      if (st.isOnFire) fireRef.current.intensity = 2 + Math.sin(Date.now() * 0.02) * 1;
    }

    if (shieldRef.current) {
      shieldRef.current.visible = st.shieldTimer > 0;
      if (st.shieldTimer > 0) {
        (shieldRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(Date.now() * 0.003) * 0.08;
        shieldRef.current.rotation.y += delta * 0.5;
      }
    }

    // Pending ring
    if (pendingRingRef.current) {
      pendingRingRef.current.visible = isPending;
      if (isPending) {
        const pulseSpeed = isValidTarget ? 0.008 : 0.004;
        const pulseSize = isValidTarget ? 0.35 : 0.2;
        const baseOpacity = isValidTarget ? 0.5 : 0.3;
        const pulse = 1 + Math.sin(Date.now() * pulseSpeed) * pulseSize;
        pendingRingRef.current.scale.set(pulse, pulse, 1);
        const ringColor = isValidTarget ? (s.drawLineColor || '#4ade80') : '#9ca3af';
        (pendingRingRef.current.material as THREE.MeshBasicMaterial).color.set(ringColor);
        (pendingRingRef.current.material as THREE.MeshBasicMaterial).opacity = baseOpacity + Math.sin(Date.now() * 0.003) * 0.15;
        pendingRingRef.current.rotation.z += delta * (isValidTarget ? 1.5 : 0.5);
      }
    }

    // Pulse ring
    if (pulseRef.current) {
      if (st.passengers.length > 0 && !st.isDestroyed) {
        pulseRef.current.visible = true;
        const fillRatio = st.passengers.length / st.maxPassengers;
        const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.15;
        pulseRef.current.scale.set(pulseScale, pulseScale, 1);
        (pulseRef.current.material as THREE.MeshBasicMaterial).color.set(effectiveColor);
        (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + fillRatio * 0.4;
      } else {
        pulseRef.current.visible = false;
      }
    }

    // Selection ring
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

    // Tooltip
    if (isHoveredRef.current && stateRef.current.hoveredElement?.id !== stationId) {
      stateRef.current.hoveredElement = {
        type: 'station', id: stationId, name: st.nameUa,
        details: isPending
          ? (isValidTarget ? '✅ Відпусти щоб підключити!' : '🔗 Клікни кінцеву станцію лінії')
          : st.isDestroyed ? 'Зруйновано' : `HP: ${st.hp}/${st.maxHp} | Пасажири: ${st.passengers.length}/${st.maxPassengers}`,
      };
    }
  });

  const size = 2.5;
  const isPendingInitial = stateRef.current.pendingStations.includes(stationId);
  const nameColor = isPendingInitial ? '#888888' : '#e0e0e0';

  return (
    <group ref={groupRef} position={[wx, 0.4, wz]} renderOrder={15}
      onClick={(e) => { e.stopPropagation(); onClick?.(stationId); }}
      onPointerEnter={() => { isHoveredRef.current = true; onHover?.(stationId); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => {
        isHoveredRef.current = false; onHover?.(null); document.body.style.cursor = 'default';
        if (stateRef.current.hoveredElement?.type === 'station') stateRef.current.hoveredElement = null;
      }}>

      {/* Pending connect ring */}
      <mesh ref={pendingRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} visible={false}>
        <ringGeometry args={[size * 1.8, size * 2.2, 6]} />
        <meshBasicMaterial color="#9ca3af" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      <mesh ref={selectRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} visible={false}>
        <ringGeometry args={[size * 1.4, size * 1.7, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} visible={false}>
        <ringGeometry args={[size * 1.0, size * 1.3, 24]} />
        <meshBasicMaterial color="#666666" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Platform ring — uses ref for dynamic color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[size * 0.7, size * 1.0, 24]} />
        <meshStandardMaterial ref={platformMatRef} color={isPendingInitial ? '#666666' : lineColor}
          emissive={isPendingInitial ? '#444444' : lineColor} emissiveIntensity={0.25}
          transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Main station shape */}
      <mesh castShadow>
        <StationGeometry shape={station.shape} size={size} />
        <meshStandardMaterial ref={matRef} color={isPendingInitial ? '#555555' : lineColor}
          emissive={isPendingInitial ? '#333333' : lineColor} emissiveIntensity={0.25}
          metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Passenger queue */}
      <PassengerQueue stationId={stationId} stateRef={stateRef} isPending={isPendingInitial} />

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

      {/* AA Turret — tower defense model */}
      {(station.hasAATurret || station.hasSAM || station.hasAntiAir) && (
        <AATurret station={station} stateRef={stateRef} />
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

      <pointLight ref={fireRef} color="#ff4400" intensity={0} distance={6} position={[0, 1.5, 0]} visible={false} />

      {/* Station name — grey for pending */}
      <Billboard>
        <Text position={[0, size + 3.0, 0]} fontSize={station.isTransfer ? 0.75 : 0.6}
          color={nameColor} anchorX="center" anchorY="bottom"
          outlineWidth={0.05} outlineColor="#000000" maxWidth={8}>
          {station.nameUa}
        </Text>
      </Billboard>

      {/* Passenger count */}
      <Billboard>
        <Text position={[0, size + 2.3, 0]} fontSize={0.45}
          color={station.passengers.length >= station.maxPassengers - 1 ? '#ff4444' : '#ffcc00'}
          anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
          {station.passengers.length > 0 ? `${station.passengers.length}/${station.maxPassengers}` : ''}
        </Text>
      </Billboard>

      {/* HP bar */}
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
