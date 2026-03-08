import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DNIPRO_RIVER_POINTS, toWorld } from '../constants';

export function RiverPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Build a flat ribbon geometry from river points
  const geometry = useMemo(() => {
    const RIVER_WIDTH = 6;
    const curvePoints = DNIPRO_RIVER_POINTS.map(p => {
      const [x, , z] = toWorld(p.x, p.y);
      return new THREE.Vector3(x, -0.05, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
    const pts = curve.getPoints(100);

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      // Tangent
      let tangent: THREE.Vector3;
      if (i < pts.length - 1) {
        tangent = new THREE.Vector3().subVectors(pts[i + 1], p).normalize();
      } else {
        tangent = new THREE.Vector3().subVectors(p, pts[i - 1]).normalize();
      }

      // Perpendicular in XZ plane
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const halfW = RIVER_WIDTH / 2;
      // Left vertex
      vertices.push(p.x - perp.x * halfW, -0.05, p.z - perp.z * halfW);
      // Right vertex
      vertices.push(p.x + perp.x * halfW, -0.05, p.z + perp.z * halfW);

      const t = i / (pts.length - 1);
      uvs.push(0, t, 1, t);

      if (i < pts.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.4) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#1a4a6e"
        emissive="#0a2a4e"
        emissiveIntensity={0.12}
        transparent
        opacity={0.75}
        metalness={0.5}
        roughness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
