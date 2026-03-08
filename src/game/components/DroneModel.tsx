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

// ===== SHAHED: Delta-wing kamikaze drone =====
function ShahedDrone() {
  return (
    <group>
      {/* Fuselage — tapered cylinder */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.22, 2.8, 8]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Delta wings — angled */}
      <mesh rotation={[0, 0, 0.05]} position={[-0.2, 0, 0]}>
        <boxGeometry args={[0.06, 2.6, 0.03]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Wing tips angled down */}
      <mesh position={[-0.2, 1.3, -0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.04, 0.3, 0.15]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-0.2, -1.3, -0.08]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.04, 0.3, 0.15]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rear stabilizer — V-tail */}
      <mesh position={[-1.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.9, 0.6]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.2, 0, 0.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.6, 0.3]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.4, 6]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Engine exhaust glow */}
      <mesh position={[-1.5, 0, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.7} />
      </mesh>
      {/* Engine trail particles */}
      {[-1.7, -2.0, -2.4].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.08 - i * 0.02, 6, 6]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.4 - i * 0.12} />
        </mesh>
      ))}
    </group>
  );
}

// ===== MOLNIYA: Slim fast reconnaissance drone =====
function MolniyaDrone() {
  return (
    <group>
      {/* Narrow fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.12, 1.8, 8]} />
        <meshStandardMaterial color="#777" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Swept-back wings */}
      <mesh position={[0, 0, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.03, 1.8, 0.02]} />
        <meshStandardMaterial color="#999" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Canards (small front wings) */}
      <mesh position={[0.6, 0, 0]}>
        <boxGeometry args={[0.02, 0.6, 0.015]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Tail fin */}
      <mesh position={[-0.8, 0, 0.12]}>
        <boxGeometry args={[0.3, 0.02, 0.25]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Nose sensor dome */}
      <mesh position={[0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Blue-white engine trail */}
      <mesh position={[-1.0, 0, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.6} />
      </mesh>
      {[-1.2, -1.5, -1.8].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.05 - i * 0.012, 6, 6]} />
          <meshBasicMaterial color="#6699ff" transparent opacity={0.35 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ===== GERBERA: Heavy bomber drone =====
function GerberaDrone() {
  return (
    <group>
      {/* Thick fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.32, 3.2, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Large straight wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.06, 3.4, 0.04]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Twin engine pods under wings */}
      <mesh position={[0, 0.8, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.8, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Rear stabilizer */}
      <mesh position={[-1.4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.06, 1.2, 0.7]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.4, 0, 0.25]}>
        <boxGeometry args={[0.06, 0.8, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Payload bulge underneath */}
      <mesh position={[0.2, 0, -0.28]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Nose */}
      <mesh position={[1.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.5, 6]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Red pulsing engine glow */}
      <mesh position={[-1.7, 0, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.6} />
      </mesh>
      {/* Twin pod trails */}
      <mesh position={[-0.3, 0.8, -0.2]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.4} />
      </mesh>
      <mesh position={[-0.3, -0.8, -0.2]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.4} />
      </mesh>
      {/* Main trail */}
      {[-2.0, -2.4, -2.9].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.1 - i * 0.025, 6, 6]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.35 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

const DRONE_COMPONENTS: Record<DroneType, React.FC> = {
  shahed: ShahedDrone,
  molniya: MolniyaDrone,
  gerbera: GerberaDrone,
};

export function DroneModel({ droneId, stateRef, onClick }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const smoothPos = useRef(new THREE.Vector3());
  const smoothAngle = useRef<number | null>(null);
  const initialized = useRef(false);
  const hitFlashRef = useRef(0);
  const lastHp = useRef<number | null>(null);

  const drone = useMemo(() => stateRef.current.drones.find(d => d.id === droneId), [droneId]);
  if (!drone) return null;

  const DroneComponent = DRONE_COMPONENTS[drone.droneType];

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
      hitFlashRef.current = 0.3;
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

    // Selection outline pulse
    if (outlineRef.current) {
      const isSelected = state.selectedDroneId === droneId;
      outlineRef.current.visible = isSelected;
      if (isSelected) {
        const pulse = 1.15 + Math.sin(Date.now() * 0.008) * 0.1;
        outlineRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  const isSelected = stateRef.current.selectedDroneId === droneId;
  const outlineSize = drone.droneType === 'gerbera' ? 2.5 : drone.droneType === 'shahed' ? 2.0 : 1.5;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(droneId); }}
    >
      <DroneComponent />

      {/* Danger glow */}
      <pointLight color="#ff0000" intensity={1.0} distance={5} />

      {/* Hit flash overlay */}
      {hitFlashRef.current > 0 && (
        <mesh>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Selection outline — wireframe sphere */}
      <mesh ref={outlineRef} visible={isSelected}>
        <sphereGeometry args={[outlineSize, 12, 12]} />
        <meshBasicMaterial color="#ff4444" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Selection ring on ground */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.5, 16]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.5} side={THREE.DoubleSide} />
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
