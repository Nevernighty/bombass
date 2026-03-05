import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, DroneType } from '../types';
import { DRONE_TYPES, toWorld } from '../constants';

interface DroneModelProps {
  droneId: string;
  stateRef: React.MutableRefObject<GameState>;
}

function DroneMesh({ droneType }: { droneType: DroneType }) {
  const config = DRONE_TYPES[droneType];

  if (droneType === 'shahed') {
    return (
      <group>
        {/* Fuselage */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.3, 1.8, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Wings */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.1, 2.2, 0.05]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Tail */}
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[0.1, 0.8, 0.05]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Tail fin */}
        <mesh position={[-0.8, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.05]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Red nose */}
        <mesh position={[0.95, 0, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#cc0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  if (droneType === 'molniya') {
    return (
      <group>
        {/* Sleek body */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.2, 1.2, 6]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Delta wings */}
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.6, 1.5, 0.03]} />
          <meshStandardMaterial color="#999999" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Engine glow */}
        <pointLight color="#00aaff" intensity={2} distance={3} position={[-0.7, 0, 0]} />
      </group>
    );
  }

  // Gerbera - heavy bomber
  return (
    <group>
      {/* Heavy fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.4, 2.2, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Wide wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.15, 3.0, 0.06]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Payload */}
      <mesh position={[0.3, -0.3, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Engine glow */}
      <pointLight color="#ff4400" intensity={2} distance={4} position={[-1.2, 0, 0]} />
    </group>
  );
}

export function DroneModel({ droneId, stateRef }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  const drone = useMemo(() => stateRef.current.drones.find(d => d.id === droneId), [droneId]);
  if (!drone) return null;

  useFrame(() => {
    const state = stateRef.current;
    const d = state.drones.find(dr => dr.id === droneId);
    if (!d || !groupRef.current || d.isDestroyed) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    const [wx, , wz] = toWorld(d.x, d.y);
    const flyHeight = 6 + Math.sin(d.wobble) * 0.5;
    groupRef.current.position.set(wx, flyHeight, wz);

    // Face toward target
    const target = state.stations.find(s => s.id === d.targetStationId);
    if (target) {
      const [tx, , tz] = toWorld(target.x, target.y);
      const angle = Math.atan2(tx - wx, tz - wz);
      groupRef.current.rotation.y = angle;
    }

    // Wobble
    groupRef.current.rotation.z = Math.sin(d.wobble) * 0.1;
    groupRef.current.rotation.x = Math.sin(d.wobble * 0.7) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <DroneMesh droneType={drone.droneType} />

      {/* Danger glow */}
      <pointLight color="#ff0000" intensity={1} distance={6} />

      {/* HP indicator for multi-HP drones */}
      {drone.maxHp > 1 && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={drone.hp > 1 ? '#ffaa00' : '#ff0000'} />
        </mesh>
      )}
    </group>
  );
}
