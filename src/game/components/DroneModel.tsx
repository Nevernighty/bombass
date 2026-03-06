import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, DroneType } from '../types';
import { DRONE_TYPES, toWorld } from '../constants';

interface DroneModelProps {
  droneId: string;
  stateRef: React.MutableRefObject<GameState>;
}

const DRONE_GLB: Record<DroneType, string> = {
  shahed: '/models/shahed_136.glb',
  molniya: '/models/molniya_uav.glb',
  gerbera: '/models/uav_gerbera_low-poly.glb',
};

const DRONE_SCALE: Record<DroneType, number> = {
  shahed: 3.0,
  molniya: 1.5,
  gerbera: 2.5,
};

const DRONE_ROTATION_OFFSET: Record<DroneType, [number, number, number]> = {
  shahed: [0, Math.PI, 0],
  molniya: [0, 0, 0],
  gerbera: [0, Math.PI, 0],
};

const DRONE_FLY_HEIGHT: Record<DroneType, number> = {
  shahed: 7,
  molniya: 9,
  gerbera: 5,
};

function DroneGLB({ droneType }: { droneType: DroneType }) {
  const { scene } = useGLTF(DRONE_GLB[droneType]);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const scale = DRONE_SCALE[droneType];
  const rot = DRONE_ROTATION_OFFSET[droneType];
  return <primitive object={cloned} scale={scale} rotation={rot} />;
}

function DroneFallback({ droneType }: { droneType: DroneType }) {
  if (droneType === 'shahed') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.5, 3, 8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh><boxGeometry args={[0.1, 3.5, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
        <mesh position={[1.5, 0, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#cc0000" emissive="#ff0000" emissiveIntensity={0.5} /></mesh>
      </group>
    );
  }
  if (droneType === 'molniya') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.3, 2, 6]} /><meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} /></mesh>
        <mesh><boxGeometry args={[0.8, 2.5, 0.03]} /><meshStandardMaterial color="#999" /></mesh>
        <pointLight color="#00aaff" intensity={2} distance={4} position={[-1, 0, 0]} />
      </group>
    );
  }
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.6, 3.5, 8]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
      <mesh><boxGeometry args={[0.2, 4.5, 0.08]} /><meshStandardMaterial color="#444" /></mesh>
      <pointLight color="#ff4400" intensity={3} distance={6} position={[-1.5, 0, 0]} />
    </group>
  );
}

export function DroneModel({ droneId, stateRef }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevAngle = useRef<number | null>(null);

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
    const flyHeight = DRONE_FLY_HEIGHT[d.droneType] + Math.sin(d.wobble) * 0.5;
    groupRef.current.position.set(wx, flyHeight, wz);

    // Face toward target with smooth rotation
    const target = state.stations.find(s => s.id === d.targetStationId);
    if (target) {
      const [tx, , tz] = toWorld(target.x, target.y);
      const targetAngle = Math.atan2(tx - wx, tz - wz);
      
      if (prevAngle.current === null) {
        prevAngle.current = targetAngle;
      }
      let diff = targetAngle - prevAngle.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      prevAngle.current += diff * 0.05;
      groupRef.current.rotation.y = prevAngle.current;
    }

    // Wobble
    groupRef.current.rotation.z = Math.sin(d.wobble) * 0.08;
    groupRef.current.rotation.x = Math.sin(d.wobble * 0.7) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <Suspense fallback={<DroneFallback droneType={drone.droneType} />}>
        <DroneGLB droneType={drone.droneType} />
      </Suspense>

      {/* Danger glow */}
      <pointLight color="#ff0000" intensity={2} distance={8} />

      {/* Engine trail */}
      <mesh position={[-1, 0, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.4} />
      </mesh>

      {/* HP indicator for multi-HP drones */}
      {drone.maxHp > 1 && (
        <Billboard>
          <Text
            position={[0, 2, 0]}
            fontSize={0.5}
            color={drone.hp > 1 ? '#ffaa00' : '#ff0000'}
            anchorX="center"
            outlineWidth={0.04}
            outlineColor="#000"
          >
            {`HP ${drone.hp}/${drone.maxHp}`}
          </Text>
        </Billboard>
      )}

      {/* Drone type label */}
      <Billboard>
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.4}
          color="#ff4444"
          anchorX="center"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          {drone.droneType.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

// Preload all drone models
try { useGLTF.preload('/models/shahed_136.glb'); } catch {}
try { useGLTF.preload('/models/molniya_uav.glb'); } catch {}
try { useGLTF.preload('/models/uav_gerbera_low-poly.glb'); } catch {}
