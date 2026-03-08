import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DNIPRO_RIVER_POINTS, toWorld } from '../constants';

export function RiverPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const bankLeftRef = useRef<THREE.Mesh>(null);
  const bankRightRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const points = DNIPRO_RIVER_POINTS.map(p => {
      const [x, , z] = toWorld(p.x, p.y);
      return new THREE.Vector3(x, 0.05, z);
    });
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, []);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 3, 8, false), [curve]);
  const bankLeftGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 3.8, 8, false), [curve]);
  const bankRightGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 4.5, 8, false), [curve]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.3) * 0.06;
      // Animate UVs for flow
      const geo = meshRef.current.geometry;
      const uvAttr = geo.getAttribute('uv');
      if (uvAttr) {
        const offset = clock.elapsedTime * 0.02;
        for (let i = 0; i < uvAttr.count; i++) {
          uvAttr.setY(i, uvAttr.getY(i) + offset * 0.001);
        }
        uvAttr.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* River banks — dark strips */}
      <mesh ref={bankRightRef} geometry={bankRightGeo}>
        <meshStandardMaterial color="#0a1a2a" emissive="#0a0e1a" emissiveIntensity={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={bankLeftRef} geometry={bankLeftGeo}>
        <meshStandardMaterial color="#0d1f30" emissive="#0a1020" emissiveIntensity={0.08} side={THREE.DoubleSide} />
      </mesh>
      {/* Main river */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#1a4a6e"
          emissive="#1a3a5e"
          emissiveIntensity={0.12}
          transparent
          opacity={0.75}
          metalness={0.3}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
