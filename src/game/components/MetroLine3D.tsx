import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface MetroLine3DProps {
  line: 'red' | 'blue' | 'green';
  stateRef: React.MutableRefObject<GameState>;
}

export function MetroLine3D({ line, stateRef }: MetroLine3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const prevKey = useRef('__init__');
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const glowGeometryRef = useRef<THREE.TubeGeometry | null>(null);

  const { color } = METRO_LINES[line];

  useFrame(() => {
    const state = stateRef.current;
    const activeIds = getActiveLineStations(state, line);
    const key = activeIds.join(',');

    if (key !== prevKey.current && activeIds.length >= 2) {
      prevKey.current = key;

      const points: THREE.Vector3[] = [];
      activeIds.forEach(id => {
        const st = STATION_MAP.get(id);
        if (st) {
          const [wx, , wz] = toWorld(st.x, st.y);
          points.push(new THREE.Vector3(wx, 0.2, wz));
        }
      });

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);

        geometryRef.current?.dispose();
        glowGeometryRef.current?.dispose();

        const segments = Math.max(points.length * 16, 48);
        const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.3, 6, false);
        const glowGeo = new THREE.TubeGeometry(curve, segments, 0.7, 6, false);

        geometryRef.current = tubeGeo;
        glowGeometryRef.current = glowGeo;

        if (meshRef.current) meshRef.current.geometry = tubeGeo;
        if (glowRef.current) glowRef.current.geometry = glowGeo;
      }
    }

    // Night glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.35 : 0.12;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 0.8 : 0.4;
    }
  });

  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -100, 0), new THREE.Vector3(1, -100, 0)
  ]), []);

  return (
    <group>
      <mesh ref={meshRef}>
        <tubeGeometry args={[initCurve, 2, 0.3, 6, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={glowRef}>
        <tubeGeometry args={[initCurve, 2, 0.7, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
