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
  const prevCount = useRef(0);
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const glowGeometryRef = useRef<THREE.TubeGeometry | null>(null);
  const prevPointsKey = useRef('');

  const { color } = METRO_LINES[line];

  useFrame(() => {
    const state = stateRef.current;
    const activeIds = getActiveLineStations(state, line);

    if (activeIds.length < 2) {
      if (meshRef.current) meshRef.current.visible = false;
      if (glowRef.current) glowRef.current.visible = false;
      return;
    }

    // Build points
    const points: THREE.Vector3[] = [];
    activeIds.forEach(id => {
      const st = STATION_MAP.get(id);
      if (st) {
        const [wx, , wz] = toWorld(st.x, st.y);
        points.push(new THREE.Vector3(wx, 0.15, wz));
      }
    });

    if (points.length < 2) return;

    // Only rebuild geometry when station set changes
    const key = activeIds.join(',');
    if (key !== prevPointsKey.current) {
      prevPointsKey.current = key;

      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);

      geometryRef.current?.dispose();
      glowGeometryRef.current?.dispose();

      const segments = Math.max(points.length * 20, 64);
      const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.9, 8, false);
      const glowGeo = new THREE.TubeGeometry(curve, segments, 1.8, 8, false);

      geometryRef.current = tubeGeo;
      glowGeometryRef.current = glowGeo;

      if (meshRef.current) meshRef.current.geometry = tubeGeo;
      if (glowRef.current) glowRef.current.geometry = glowGeo;
    }

    if (meshRef.current) meshRef.current.visible = true;
    if (glowRef.current) glowRef.current.visible = true;

    // Night glow adjustments
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.5 : 0.25;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 1.0 : 0.7;
    }
  });

  // Start with a tiny offscreen geometry — will be replaced immediately
  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(1, 0.15, 0)
  ]), []);

  return (
    <group>
      <mesh ref={meshRef} visible={false}>
        <tubeGeometry args={[initCurve, 2, 0.9, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <mesh ref={glowRef} visible={false}>
        <tubeGeometry args={[initCurve, 2, 1.8, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
