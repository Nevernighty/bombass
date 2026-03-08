import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

function ExplosionsLayerInner({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
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

      const outerMesh = group.children[0] as THREE.Mesh;
      if (outerMesh) {
        const scale = exp.radius * 0.18;
        outerMesh.scale.set(scale, scale * 0.7, scale);
        const mat = outerMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = exp.alpha * 0.7;
      }

      const innerMesh = group.children[1] as THREE.Mesh;
      if (innerMesh) {
        const s2 = exp.radius * 0.1;
        innerMesh.scale.set(s2, s2, s2);
        const mat2 = innerMesh.material as THREE.MeshBasicMaterial;
        mat2.opacity = exp.alpha * 0.95;
      }

      const ringMesh = group.children[2] as THREE.Mesh;
      if (ringMesh) {
        const ringScale = exp.radius * 0.25;
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        const mat3 = ringMesh.material as THREE.MeshBasicMaterial;
        mat3.opacity = exp.alpha * 0.35;
      }

      for (let j = 3; j < 11; j++) {
        const spark = group.children[j] as THREE.Mesh;
        if (spark) {
          const t = 1 - exp.alpha;
          const angle = (j - 3) * (Math.PI * 2 / 8);
          const dist = t * exp.radius * 0.12;
          spark.position.set(Math.cos(angle) * dist, 2.5 + t * 5 - t * t * 4, Math.sin(angle) * dist);
          spark.visible = exp.alpha > 0.2;
          const mat = spark.material as THREE.MeshBasicMaterial;
          mat.opacity = exp.alpha;
        }
      }

      for (let j = 11; j < 17; j++) {
        const smoke = group.children[j] as THREE.Mesh;
        if (smoke) {
          const t = 1 - exp.alpha;
          const angle = (j - 11) * (Math.PI * 2 / 6) + 0.5;
          const dist = t * exp.radius * 0.08;
          smoke.position.set(Math.cos(angle) * dist, 1 + t * 8, Math.sin(angle) * dist);
          const smokeScale = 0.3 + t * 1.5;
          smoke.scale.set(smokeScale, smokeScale, smokeScale);
          smoke.visible = t > 0.2;
          const mat = smoke.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, (1 - t * 1.3) * 0.5);
        }
      }

      for (let j = 17; j < 21; j++) {
        const debris = group.children[j] as THREE.Mesh;
        if (debris) {
          const t = 1 - exp.alpha;
          const angle = (j - 17) * (Math.PI * 2 / 4) + 1;
          const dist = t * exp.radius * 0.15;
          const gravity = t * t * 6;
          debris.position.set(Math.cos(angle) * dist, 1.5 + t * 6 - gravity, Math.sin(angle) * dist);
          debris.rotation.set(t * 10, t * 8, t * 6);
          debris.visible = exp.alpha > 0.1;
          const mat = debris.material as THREE.MeshStandardMaterial;
          mat.opacity = exp.alpha;
        }
      }

      const light = group.children[21] as THREE.PointLight;
      if (light) {
        light.intensity = exp.alpha * 12;
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
          <mesh>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.7} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#ffffaa" transparent opacity={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1, 24]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh key={`spark-${j}`}>
              <sphereGeometry args={[0.15, 6, 6]} />
              <meshBasicMaterial color="#ffcc00" transparent opacity={1} />
            </mesh>
          ))}
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh key={`smoke-${j}`}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color="#222222" transparent opacity={0.4} />
            </mesh>
          ))}
          {Array.from({ length: 4 }).map((_, j) => (
            <mesh key={`debris-${j}`}>
              <boxGeometry args={[0.2, 0.15, 0.1]} />
              <meshStandardMaterial color="#555555" transparent opacity={1} metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <pointLight color="#ff4400" intensity={8} distance={25} />
        </group>
      ))}
    </group>
  );
}

export const ExplosionsLayer = React.forwardRef<THREE.Group, { stateRef: React.MutableRefObject<GameState> }>(
  (props, ref) => <ExplosionsLayerInner {...props} />
);
