import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, Explosion } from '../types';
import { toWorld } from '../constants';

interface ExplosionEffectProps {
  explosion: Explosion;
}

export function ExplosionEffect({ explosion }: ExplosionEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const [wx, , wz] = toWorld(explosion.x, explosion.y);

  useFrame(() => {
    if (!meshRef.current) return;

    const scale = explosion.radius * 0.1;
    meshRef.current.scale.set(scale, scale, scale);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = explosion.alpha * 0.8;

    if (lightRef.current) {
      lightRef.current.intensity = explosion.alpha * 5;
    }
  });

  return (
    <group position={[wx, 1, wz]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner bright core */}
      <mesh scale={[explosion.radius * 0.05, explosion.radius * 0.05, explosion.radius * 0.05]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={explosion.alpha * 0.9} />
      </mesh>
      <pointLight ref={lightRef} color="#ff4400" intensity={3} distance={15} />
    </group>
  );
}

export function ExplosionsLayer({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<number, { mesh: THREE.Mesh; light: THREE.PointLight }>>(new Map());

  useFrame(() => {
    const state = stateRef.current;
    // Simple approach: render up to 10 explosions
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    state.explosions.forEach((exp, i) => {
      if (i >= children.length) return;
      const group = children[i] as THREE.Group;
      if (!group) return;
      const [wx, , wz] = toWorld(exp.x, exp.y);
      group.position.set(wx, 1, wz);
      group.visible = true;
      const scale = exp.radius * 0.1;
      group.scale.set(scale, scale, scale);
      // Update material opacity
      const mesh = group.children[0] as THREE.Mesh;
      if (mesh?.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = exp.alpha * 0.8;
      }
    });

    // Hide unused
    for (let i = state.explosions.length; i < children.length; i++) {
      children[i].visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} visible={false}>
          <mesh>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
          </mesh>
          <pointLight color="#ff4400" intensity={3} distance={15} />
        </group>
      ))}
    </group>
  );
}
