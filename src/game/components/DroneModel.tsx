import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, DroneType } from '../types';
import { DRONE_TYPES, STATION_MAP, toWorld } from '../constants';

interface DroneModelProps {
  droneId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

const DRONE_FLY_HEIGHT: Record<DroneType, number> = {
  shahed: 6,
  molniya: 8,
  gerbera: 5,
};

const DRONE_BODY_COLOR: Record<DroneType, string> = {
  shahed: '#4a4a4a',
  molniya: '#666666',
  gerbera: '#3a3a3a',
};

// Lightweight procedural drone
function ProceduralDrone({ droneType }: { droneType: DroneType }) {
  const bodyColor = DRONE_BODY_COLOR[droneType];

  if (droneType === 'shahed') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.25, 2.5, 6]} />
          <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 2.2, 0.03]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-1.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.04, 0.8, 0.5]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-1.3, 0, 0]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  if (droneType === 'molniya') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.15, 1.5, 6]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.04, 1.6, 0.02]} />
          <meshStandardMaterial color="#777" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[-0.7, 0, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  // gerbera
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.35, 3.0, 6]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.08, 3.0, 0.04]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.06, 1.0, 0.6]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.6, 0, 0]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export function DroneModel({ droneId, stateRef, onClick }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3());
  const smoothAngle = useRef<number | null>(null);
  const initialized = useRef(false);
  const hitFlashRef = useRef(0);
  const lastHp = useRef<number | null>(null);

  const drone = useMemo(() => stateRef.current.drones.find(d => d.id === droneId), [droneId]);
  if (!drone) return null;

  useFrame((_, delta) => {
    const state = stateRef.current;
    const d = state.drones.find(dr => dr.id === droneId);
    if (!d || !groupRef.current || d.isDestroyed) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    const [wx, , wz] = toWorld(d.x, d.y);
    const flyHeight = DRONE_FLY_HEIGHT[d.droneType] + Math.sin(d.wobble) * 0.4;
    const targetPos = new THREE.Vector3(wx, flyHeight, wz);

    if (!initialized.current) {
      smoothPos.current.copy(targetPos);
      initialized.current = true;
    }

    smoothPos.current.lerp(targetPos, Math.min(1, delta * 6));
    groupRef.current.position.copy(smoothPos.current);

    // Hit flash detection
    if (lastHp.current !== null && d.hp < lastHp.current) {
      hitFlashRef.current = 0.3; // flash for 0.3s
    }
    lastHp.current = d.hp;
    if (hitFlashRef.current > 0) hitFlashRef.current -= delta;

    // Smooth rotation toward target station
    const targetSt = STATION_MAP.get(d.targetStationId);
    if (targetSt) {
      const [tx, , tz] = toWorld(targetSt.x, targetSt.y);
      const targetAngle = Math.atan2(tx - smoothPos.current.x, tz - smoothPos.current.z);

      if (smoothAngle.current === null) smoothAngle.current = targetAngle;
      let diff = targetAngle - smoothAngle.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      smoothAngle.current += diff * 0.08;
      groupRef.current.rotation.y = smoothAngle.current;
    }

    groupRef.current.rotation.z = Math.sin(d.wobble) * 0.04;
    groupRef.current.rotation.x = Math.sin(d.wobble * 0.7) * 0.02;
  });

  const isQteTarget = stateRef.current.qteDroneId === droneId;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(droneId); }}
    >
      <ProceduralDrone droneType={drone.droneType} />

      {/* Danger glow */}
      <pointLight color="#ff0000" intensity={1.0} distance={5} />

      {/* Hit flash overlay */}
      {hitFlashRef.current > 0 && (
        <mesh>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* QTE target pulsing ring */}
      {isQteTarget && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.5, 16]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* HP for multi-HP drones */}
      {drone.maxHp > 1 && (
        <Billboard>
          <Text
            position={[0, 2, 0]}
            fontSize={0.45}
            color={drone.hp > 1 ? '#ffaa00' : '#ff0000'}
            anchorX="center"
            outlineWidth={0.03}
            outlineColor="#000"
          >
            {`HP ${drone.hp}/${drone.maxHp}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
