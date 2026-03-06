import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATIONS, toWorld } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface MetroLine3DProps {
  line: 'red' | 'blue' | 'green';
  stateRef: React.MutableRefObject<GameState>;
}

export function MetroLine3D({ line, stateRef }: MetroLine3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const prevKey = useRef('');
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
        const st = STATIONS.find(s => s.id === id);
        if (st) {
          const [wx, , wz] = toWorld(st.x, st.y);
          points.push(new THREE.Vector3(wx, 0.15, wz));
        }
      });

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);

        geometryRef.current?.dispose();
        glowGeometryRef.current?.dispose();

        const segments = Math.max(points.length * 20, 64);
        const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.35, 8, false);
        const glowGeo = new THREE.TubeGeometry(curve, segments, 0.7, 8, false);

        geometryRef.current = tubeGeo;
        glowGeometryRef.current = glowGeo;

        if (meshRef.current) meshRef.current.geometry = tubeGeo;
        if (glowRef.current) glowRef.current.geometry = glowGeo;
      }
    }

    // Night glow intensity
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.35 : 0.12;
    }

    // Main line emissive pulse
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 0.6 : 0.3;
    }
  });

  // Create a tiny initial geometry that will be replaced
  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -100, 0), new THREE.Vector3(1, -100, 0)
  ]), []);

  return (
    <group>
      {/* Main line tube */}
      <mesh ref={meshRef}>
        <tubeGeometry args={[initCurve, 2, 0.35, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Glow tube */}
      <mesh ref={glowRef}>
        <tubeGeometry args={[initCurve, 2, 0.7, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
