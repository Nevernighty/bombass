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
  shahed: 3.5,
  molniya: 2.0,
  gerbera: 3.0,
};

const DRONE_ROTATION_OFFSET: Record<DroneType, [number, number, number]> = {
  shahed: [0, Math.PI, 0],
  molniya: [0, 0, 0],
  gerbera: [0, Math.PI, 0],
};

const DRONE_FLY_HEIGHT: Record<DroneType, number> = {
  shahed: 6,
  molniya: 8,
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
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.4, 2.5, 6]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.08, 2.8, 0.04]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

export function DroneModel({ droneId, stateRef }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3());
  const smoothAngle = useRef<number | null>(null);
  const initialized = useRef(false);

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

    // Smooth rotation toward target
    const target = state.stations.find(s => s.id === d.targetStationId);
    if (target) {
      const [tx, , tz] = toWorld(target.x, target.y);
      const targetAngle = Math.atan2(tx - smoothPos.current.x, tz - smoothPos.current.z);

      if (smoothAngle.current === null) smoothAngle.current = targetAngle;
      let diff = targetAngle - smoothAngle.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      smoothAngle.current += diff * 0.06;
      groupRef.current.rotation.y = smoothAngle.current;
    }

    // Wobble
    groupRef.current.rotation.z = Math.sin(d.wobble) * 0.06;
    groupRef.current.rotation.x = Math.sin(d.wobble * 0.7) * 0.03;
  });

  return (
    <group ref={groupRef}>
      <Suspense fallback={<DroneFallback droneType={drone.droneType} />}>
        <DroneGLB droneType={drone.droneType} />
      </Suspense>

      {/* Danger glow */}
      <pointLight color="#ff0000" intensity={1.5} distance={6} />

      {/* Engine trail */}
      <mesh position={[-0.8, 0, 0]}>
        <sphereGeometry args={[0.3, 6, 6]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.4} />
      </mesh>

      {/* HP indicator */}
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

      {/* Type label */}
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

try { useGLTF.preload('/models/shahed_136.glb'); } catch {}
try { useGLTF.preload('/models/molniya_uav.glb'); } catch {}
try { useGLTF.preload('/models/uav_gerbera_low-poly.glb'); } catch {}
