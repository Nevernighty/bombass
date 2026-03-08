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
      return new THREE.Vector3(x, 0.08, z);
    });
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, []);

  // Use flat ribbon shape instead of tube to avoid metro-underwater look
  const geometry = useMemo(() => {
    const pts = curve.getPoints(80);
    const shape = new THREE.Shape();
    // Create a flat river using extruded path
    // We'll use TubeGeometry but very flat
    return new THREE.TubeGeometry(curve, 80, 4, 4, false);
  }, [curve]);
  
  const bankGeo = useMemo(() => new THREE.TubeGeometry(curve, 80, 5.5, 4, false), [curve]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group>
      {/* River banks */}
      <mesh ref={bankLeftRef} geometry={bankGeo}>
        <meshStandardMaterial color="#0a1520" emissive="#050a12" emissiveIntensity={0.05} side={THREE.DoubleSide} />
      </mesh>
      {/* Main river */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#1a4a6e"
          emissive="#1a3a5e"
          emissiveIntensity={0.15}
          transparent
          opacity={0.8}
          metalness={0.4}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
