import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld, BRIDGE_STATION_IDS } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface MetroLine3DProps {
  line: 'red' | 'blue' | 'green';
  stateRef: React.MutableRefObject<GameState>;
}

const TUBE_RADIUS = 0.18;
const GLOW_RADIUS = 0.35;
const BASE_HEIGHT = 0.2;
const BRIDGE_HEIGHT = 3.5;

export function MetroLine3D({ line, stateRef }: MetroLine3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
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

    const key = activeIds.join(',');
    if (key !== prevPointsKey.current) {
      prevPointsKey.current = key;

      // Build points with bridge elevation
      const points: THREE.Vector3[] = [];
      activeIds.forEach(id => {
        const st = STATION_MAP.get(id);
        if (st) {
          const [wx, , wz] = toWorld(st.x, st.y);
          const isBridge = BRIDGE_STATION_IDS.has(id);
          const height = isBridge ? BRIDGE_HEIGHT : BASE_HEIGHT;
          points.push(new THREE.Vector3(wx, height, wz));
        }
      });

      if (points.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);

      geometryRef.current?.dispose();
      glowGeometryRef.current?.dispose();

      const segments = Math.max(points.length * 16, 48);
      const tubeGeo = new THREE.TubeGeometry(curve, segments, TUBE_RADIUS, 8, false);
      const glowGeo = new THREE.TubeGeometry(curve, segments, GLOW_RADIUS, 8, false);

      geometryRef.current = tubeGeo;
      glowGeometryRef.current = glowGeo;

      if (meshRef.current) meshRef.current.geometry = tubeGeo;
      if (glowRef.current) glowRef.current.geometry = glowGeo;
    }

    if (meshRef.current) meshRef.current.visible = true;
    if (glowRef.current) glowRef.current.visible = true;

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.35 : 0.18;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 1.0 : 0.6;
    }
  });

  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, BASE_HEIGHT, 0), new THREE.Vector3(1, BASE_HEIGHT, 0)
  ]), []);

  return (
    <group>
      <mesh ref={meshRef} visible={false}>
        <tubeGeometry args={[initCurve, 4, TUBE_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={glowRef} visible={false}>
        <tubeGeometry args={[initCurve, 4, GLOW_RADIUS, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
