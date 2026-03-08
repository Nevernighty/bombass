import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
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

const DRONE_MODEL_PATHS: Record<DroneType, string> = {
  shahed: '/models/shahed_136.glb',
  molniya: '/models/molniya_uav.glb',
  gerbera: '/models/uav_gerbera_low-poly.glb',
};

const DRONE_SCALES: Record<DroneType, number> = {
  shahed: 1.2,
  molniya: 0.8,
  gerbera: 1.5,
};

function GLBDrone({ droneType }: { droneType: DroneType }) {
  const { scene } = useGLTF(DRONE_MODEL_PATHS[droneType]);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        // Ensure materials are not shared across clones
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return s;
  }, [scene]);

  const scale = DRONE_SCALES[droneType];
  return <primitive object={cloned} scale={[scale, scale, scale]} />;
}

// Preload all drone models
useGLTF.preload('/models/shahed_136.glb');
useGLTF.preload('/models/molniya_uav.glb');
useGLTF.preload('/models/uav_gerbera_low-poly.glb');

// Smoke trail particles (kept from procedural version)
function SmokeTrail({ droneType }: { droneType: DroneType }) {
  const count = droneType === 'gerbera' ? 6 : droneType === 'shahed' ? 8 : 6;
  const color = droneType === 'molniya' ? '#6699ff' : droneType === 'gerbera' ? '#555555' : '#888888';
  const baseSize = droneType === 'gerbera' ? 0.12 : 0.1;

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[-(1.5 + i * 0.4), Math.sin(i * 1.5) * 0.06, Math.cos(i * 2) * 0.04]}>
          <sphereGeometry args={[baseSize - i * 0.012, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.35 - i * 0.04} />
        </mesh>
      ))}
      {/* Engine glow */}
      <mesh position={[-1.2, 0, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={droneType === 'molniya' ? '#4488ff' : '#ff4400'} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export function DroneModel({ droneId, stateRef, onClick }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const reticleRef = useRef<THREE.Mesh>(null);
  const dangerRingRef = useRef<THREE.Mesh>(null);
  const smoothPos = useRef(new THREE.Vector3());
  const smoothAngle = useRef<number | null>(null);
  const initialized = useRef(false);
  const hitFlashRef = useRef(0);
  const lastHp = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const isHovered = useRef(false);
  const stunFlickerRef = useRef(0);

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

    if (d.isStunned) {
      stunFlickerRef.current += delta;
      groupRef.current.visible = Math.sin(stunFlickerRef.current * 30) > 0;
    } else {
      stunFlickerRef.current = 0;
    }

    const [wx, , wz] = toWorld(d.x, d.y);
    const flyHeight = DRONE_FLY_HEIGHT[d.droneType] + Math.sin(d.wobble) * 0.4;
    const targetPos = new THREE.Vector3(wx, flyHeight, wz);

    if (!initialized.current) {
      smoothPos.current.copy(targetPos);
      initialized.current = true;
    }

    smoothPos.current.lerp(targetPos, Math.min(1, delta * 6));
    groupRef.current.position.copy(smoothPos.current);

    if (lastHp.current !== null && d.hp < lastHp.current) {
      hitFlashRef.current = 0.15;
      scaleRef.current = 1.3;
    }
    lastHp.current = d.hp;
    if (hitFlashRef.current > 0) hitFlashRef.current -= delta;
    scaleRef.current += (1 - scaleRef.current) * 0.1;
    groupRef.current.scale.setScalar(scaleRef.current);

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

    if (outlineRef.current) {
      const isSelected = state.selectedDroneId === droneId;
      outlineRef.current.visible = isSelected;
      if (isSelected) {
        const pulse = 1.15 + Math.sin(Date.now() * 0.008) * 0.1;
        outlineRef.current.scale.set(pulse, pulse, pulse);
      }
    }

    if (reticleRef.current) {
      reticleRef.current.visible = isHovered.current;
      if (isHovered.current) {
        reticleRef.current.rotation.z += delta * 2;
        const rPulse = 1 + Math.sin(Date.now() * 0.008) * 0.1;
        reticleRef.current.scale.set(rPulse, rPulse, rPulse);
      }
    }

    if (dangerRingRef.current) {
      dangerRingRef.current.position.set(smoothPos.current.x, 0.1, smoothPos.current.z);
      dangerRingRef.current.visible = true;
      const ringPulse = 1 + Math.sin(Date.now() * 0.004) * 0.1;
      dangerRingRef.current.scale.set(ringPulse, ringPulse, 1);
    }
  });

  const isSelected = stateRef.current.selectedDroneId === droneId;
  const outlineSize = drone.droneType === 'gerbera' ? 2.5 : drone.droneType === 'shahed' ? 2.0 : 1.5;
  const dangerRadius = drone.droneType === 'gerbera' ? 3.0 : drone.droneType === 'shahed' ? 2.0 : 1.5;

  return (
    <>
      <mesh ref={dangerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} visible={false}>
        <ringGeometry args={[dangerRadius * 0.8, dangerRadius, 16]} />
        <meshBasicMaterial color="#ff2222" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(droneId); }}
        onPointerEnter={() => { isHovered.current = true; document.body.style.cursor = 'crosshair'; }}
        onPointerLeave={() => { isHovered.current = false; document.body.style.cursor = 'default'; }}
      >
        <GLBDrone droneType={drone.droneType} />
        <SmokeTrail droneType={drone.droneType} />

        <pointLight color="#ff0000" intensity={1.0} distance={5} />

        {hitFlashRef.current > 0 && (
          <mesh>
            <sphereGeometry args={[1.5, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={hitFlashRef.current * 4} />
          </mesh>
        )}

        <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[outlineSize * 0.8, outlineSize * 1.0, 4]} />
          <meshBasicMaterial color="#ff2222" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>

        <mesh ref={outlineRef} visible={isSelected}>
          <sphereGeometry args={[outlineSize, 12, 12]} />
          <meshBasicMaterial color="#ff4444" wireframe transparent opacity={0.6} />
        </mesh>

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
    </>
  );
}
