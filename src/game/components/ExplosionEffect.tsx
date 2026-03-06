import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

export function ExplosionsLayer({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = stateRef.current;
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    state.explosions.forEach((exp, i) => {
      if (i >= children.length) return;
      const group = children[i] as THREE.Group;
      if (!group) return;
      const [wx, , wz] = toWorld(exp.x, exp.y);
      group.position.set(wx, 1, wz);
      group.visible = true;

      // Outer fireball
      const outerMesh = group.children[0] as THREE.Mesh;
      if (outerMesh) {
        const scale = exp.radius * 0.15;
        outerMesh.scale.set(scale, scale, scale);
        const mat = outerMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = exp.alpha * 0.7;
      }

      // Inner core
      const innerMesh = group.children[1] as THREE.Mesh;
      if (innerMesh) {
        const s2 = exp.radius * 0.08;
        innerMesh.scale.set(s2, s2, s2);
        const mat2 = innerMesh.material as THREE.MeshBasicMaterial;
        mat2.opacity = exp.alpha * 0.9;
      }

      // Shockwave ring
      const ringMesh = group.children[2] as THREE.Mesh;
      if (ringMesh) {
        const ringScale = exp.radius * 0.2;
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        const mat3 = ringMesh.material as THREE.MeshBasicMaterial;
        mat3.opacity = exp.alpha * 0.4;
      }

      // Sparks
      for (let j = 3; j < Math.min(group.children.length, 11); j++) {
        const spark = group.children[j] as THREE.Mesh;
        if (spark) {
          const t = 1 - exp.alpha;
          const angle = (j - 3) * (Math.PI * 2 / 8);
          const dist = t * exp.radius * 0.1;
          spark.position.set(
            Math.cos(angle) * dist,
            2 + t * 4 - t * t * 3,
            Math.sin(angle) * dist
          );
          spark.visible = exp.alpha > 0.3;
          const mat = spark.material as THREE.MeshBasicMaterial;
          mat.opacity = exp.alpha;
        }
      }

      // Light
      const light = group.children[11] as THREE.PointLight;
      if (light) {
        light.intensity = exp.alpha * 8;
      }
    });

    for (let i = state.explosions.length; i < children.length; i++) {
      children[i].visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} visible={false}>
          {/* Outer fireball */}
          <mesh>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.7} />
          </mesh>
          {/* Inner bright core */}
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.9} />
          </mesh>
          {/* Shockwave ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1, 24]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          {/* 8 sparks */}
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh key={j}>
              <sphereGeometry args={[0.12, 6, 6]} />
              <meshBasicMaterial color="#ffcc00" transparent opacity={1} />
            </mesh>
          ))}
          {/* Light */}
          <pointLight color="#ff4400" intensity={5} distance={20} />
        </group>
      ))}
    </group>
  );
}
