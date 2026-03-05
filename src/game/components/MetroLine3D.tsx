import React, { useMemo, useRef } from 'react';
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
  const prevStationCount = useRef(0);
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const glowGeometryRef = useRef<THREE.TubeGeometry | null>(null);

  const { color, glowColor } = METRO_LINES[line];

  useFrame(() => {
    const state = stateRef.current;
    const activeIds = getActiveLineStations(state, line);

    // Only rebuild geometry when station count changes
    if (activeIds.length !== prevStationCount.current && activeIds.length >= 2) {
      prevStationCount.current = activeIds.length;

      const points: THREE.Vector3[] = [];
      activeIds.forEach(id => {
        const st = STATIONS.find(s => s.id === id);
        if (st) {
          const [wx, , wz] = toWorld(st.x, st.y);
          points.push(new THREE.Vector3(wx, 0.2, wz));
        }
      });

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

        // Dispose old geometries
        geometryRef.current?.dispose();
        glowGeometryRef.current?.dispose();

        const tubeGeo = new THREE.TubeGeometry(curve, points.length * 16, 0.2, 8, false);
        const glowGeo = new THREE.TubeGeometry(curve, points.length * 16, 0.4, 8, false);

        geometryRef.current = tubeGeo;
        glowGeometryRef.current = glowGeo;

        if (meshRef.current) meshRef.current.geometry = tubeGeo;
        if (glowRef.current) glowRef.current.geometry = glowGeo;
      }
    }

    // Night glow intensity
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.25 : 0.08;
    }
  });

  return (
    <group>
      {/* Main line tube */}
      <mesh ref={meshRef}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]), 2, 0.2, 8, false]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Glow tube (larger, transparent) */}
      <mesh ref={glowRef}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]), 2, 0.4, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
