import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

function RepairUnitsLayerInner({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = stateRef.current;
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    state.repairUnits.forEach((unit, i) => {
      if (i >= children.length) return;
      const group = children[i] as THREE.Group;
      const [wx, , wz] = toWorld(unit.x, unit.y);
      group.position.set(wx, 0.5, wz);
      group.visible = true;
      group.rotation.y += 0.03;
    });

    for (let i = state.repairUnits.length; i < children.length; i++) {
      children[i].visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={i} visible={false}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.6, 0.7]} />
            <meshStandardMaterial color="#ff6600" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.3]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1} />
          </mesh>
          <pointLight color="#ff6600" intensity={2} distance={5} position={[0, 1, 0]} />
          <Billboard>
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.4}
              color="#ff6600"
              anchorX="center"
              outlineWidth={0.04}
              outlineColor="#000"
            >
              ДСНС
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
}

export const RepairUnitsLayer = React.forwardRef<THREE.Group, { stateRef: React.MutableRefObject<GameState> }>(
  (props, ref) => <RepairUnitsLayerInner {...props} />
);
