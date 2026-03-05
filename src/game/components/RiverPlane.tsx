import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DNIPRO_RIVER_POINTS, toWorld } from '../constants';

export function RiverPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const points = DNIPRO_RIVER_POINTS.map(p => {
      const [x, , z] = toWorld(p.x, p.y);
      return new THREE.Vector3(x, 0.05, z);
    });
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, []);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 3, 8, false);
  }, [curve]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.1 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#1a4a6e"
        emissive="#1a3a5e"
        emissiveIntensity={0.1}
        transparent
        opacity={0.7}
        metalness={0.2}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
