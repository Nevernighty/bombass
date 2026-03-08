import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { STATIONS, toWorld } from '../constants';

const BUILDING_COUNT = 120;
const tempObject = new THREE.Object3D();

export function CityBuildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { matrices, colors } = useMemo(() => {
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];

    for (let i = 0; i < 200 && mats.length < BUILDING_COUNT; i++) {
      const nx = rand();
      const ny = rand();
      const [wx, , wz] = toWorld(nx, ny);

      const tooClose = STATIONS.some(s => {
        const [sx, , sz] = toWorld(s.x, s.y);
        const dx = wx - sx, dz = wz - sz;
        return Math.sqrt(dx * dx + dz * dz) < 3.5;
      });
      if (tooClose) continue;

      const h = 0.3 + rand() * 5;
      const w = 0.5 + rand() * 1.8;
      const d = 0.5 + rand() * 1.8;

      tempObject.position.set(wx, h / 2, wz);
      tempObject.scale.set(w, h, d);
      tempObject.updateMatrix();
      mats.push(tempObject.matrix.clone());

      const hue = (200 + rand() * 40) / 360;
      const sat = 0.05 + rand() * 0.15;
      const lightness = 0.12 + rand() * 0.18;
      cols.push(new THREE.Color().setHSL(hue, sat, lightness));
    }
    return { matrices: mats, colors: cols };
  }, []);

  // useEffect so meshRef.current is available after mount
  useEffect(() => {
    if (!meshRef.current) return;
    matrices.forEach((mat, i) => {
      meshRef.current!.setMatrixAt(i, mat);
      meshRef.current!.setColorAt(i, colors[i]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, matrices.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial metalness={0.15} roughness={0.85} />
    </instancedMesh>
  );
}
