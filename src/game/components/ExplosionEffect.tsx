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

      const t = 1 - exp.alpha; // 0=start, 1=end

      // 0: Outer fireball
      const outerMesh = group.children[0] as THREE.Mesh;
      if (outerMesh) {
        const scale = exp.radius * 0.22;
        outerMesh.scale.set(scale, scale * 0.6, scale);
        const mat = outerMesh.material as THREE.MeshBasicMaterial;
        // Flash white at start, then orange
        if (t < 0.1) {
          mat.color.set('#ffffff');
          mat.opacity = 1;
        } else {
          mat.color.set('#ff5500');
          mat.opacity = exp.alpha * 0.8;
        }
      }

      // 1: Inner core
      const innerMesh = group.children[1] as THREE.Mesh;
      if (innerMesh) {
        const s2 = exp.radius * (t < 0.15 ? 0.15 : 0.1 * exp.alpha);
        innerMesh.scale.set(s2, s2, s2);
        const mat2 = innerMesh.material as THREE.MeshBasicMaterial;
        mat2.opacity = exp.alpha;
      }

      // 2: Shockwave ring
      const ringMesh = group.children[2] as THREE.Mesh;
      if (ringMesh) {
        const ringScale = exp.radius * (0.1 + t * 0.4);
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        const mat3 = ringMesh.material as THREE.MeshBasicMaterial;
        mat3.opacity = Math.max(0, exp.alpha * 0.5 - t * 0.3);
      }

      // 3: Ground scorch mark
      const scorchMesh = group.children[3] as THREE.Mesh;
      if (scorchMesh) {
        const scorchScale = exp.radius * 0.2;
        scorchMesh.scale.set(scorchScale, 1, scorchScale);
        scorchMesh.visible = true;
        const mat = scorchMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.min(0.6, t * 2) * 0.5;
      }

      // 4-11: Sparks
      for (let j = 4; j < 12; j++) {
        const spark = group.children[j] as THREE.Mesh;
        if (spark) {
          const angle = (j - 4) * (Math.PI * 2 / 8);
          const dist = t * exp.radius * 0.15;
          spark.position.set(Math.cos(angle) * dist, 2.5 + t * 6 - t * t * 5, Math.sin(angle) * dist);
          spark.visible = exp.alpha > 0.15;
          const mat = spark.material as THREE.MeshBasicMaterial;
          mat.opacity = exp.alpha;
        }
      }

      // 12-17: Smoke columns (rise slower, linger longer)
      for (let j = 12; j < 18; j++) {
        const smoke = group.children[j] as THREE.Mesh;
        if (smoke) {
          const angle = (j - 12) * (Math.PI * 2 / 6) + 0.5;
          const dist = t * exp.radius * 0.06;
          smoke.position.set(Math.cos(angle) * dist, 1 + t * 12, Math.sin(angle) * dist);
          const smokeScale = 0.4 + t * 2.5;
          smoke.scale.set(smokeScale, smokeScale, smokeScale);
          smoke.visible = t > 0.15;
          const mat = smoke.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, (1 - t * 1.1) * 0.55);
        }
      }

      // 18-21: Debris
      for (let j = 18; j < 22; j++) {
        const debris = group.children[j] as THREE.Mesh;
        if (debris) {
          const angle = (j - 18) * (Math.PI * 2 / 4) + 1;
          const dist = t * exp.radius * 0.18;
          const gravity = t * t * 8;
          debris.position.set(Math.cos(angle) * dist, 1.5 + t * 7 - gravity, Math.sin(angle) * dist);
          debris.rotation.set(t * 12, t * 9, t * 7);
          debris.visible = exp.alpha > 0.08;
          const mat = debris.material as THREE.MeshStandardMaterial;
          mat.opacity = exp.alpha;
        }
      }

      // 22: Point light
      const light = group.children[22] as THREE.PointLight;
      if (light) {
        light.intensity = exp.alpha * (t < 0.1 ? 25 : 14);
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
          {/* 0: Outer fireball */}
          <mesh>
            <sphereGeometry args={[1, 14, 14]} />
            <meshBasicMaterial color="#ff5500" transparent opacity={0.8} />
          </mesh>
          {/* 1: Inner white-hot core */}
          <mesh>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color="#ffffcc" transparent opacity={0.95} />
          </mesh>
          {/* 2: Shockwave ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.2, 32]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* 3: Ground scorch mark */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color="#1a1000" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          {/* 4-11: Sparks */}
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh key={`spark-${j}`}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshBasicMaterial color="#ffdd00" transparent opacity={1} />
            </mesh>
          ))}
          {/* 12-17: Smoke */}
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh key={`smoke-${j}`}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color="#222222" transparent opacity={0.5} />
            </mesh>
          ))}
          {/* 18-21: Debris */}
          {Array.from({ length: 4 }).map((_, j) => (
            <mesh key={`debris-${j}`}>
              <boxGeometry args={[0.25, 0.18, 0.12]} />
              <meshStandardMaterial color="#555555" transparent opacity={1} metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {/* 22: Light */}
          <pointLight color="#ff4400" intensity={12} distance={35} />
        </group>
      ))}
    </group>
  );
}

export const ExplosionsLayer = React.forwardRef<THREE.Group, { stateRef: React.MutableRefObject<GameState> }>(
  (props, ref) => <ExplosionsLayerInner {...props} />
);
