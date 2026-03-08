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
  const pulseRef = useRef<THREE.Mesh>(null);
  const prevKey = useRef('__init__');
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const glowGeometryRef = useRef<THREE.TubeGeometry | null>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  const { color } = METRO_LINES[line];

  useFrame(({ clock }) => {
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
        curveRef.current = curve;

        geometryRef.current?.dispose();
        glowGeometryRef.current?.dispose();

        const segments = Math.max(points.length * 16, 48);
        const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.7, 8, false);
        const glowGeo = new THREE.TubeGeometry(curve, segments, 1.5, 8, false);

        geometryRef.current = tubeGeo;
        glowGeometryRef.current = glowGeo;

        if (meshRef.current) meshRef.current.geometry = tubeGeo;
        if (glowRef.current) glowRef.current.geometry = glowGeo;
      }
    }

    // Night glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.45 : 0.2;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 1.2 : 0.5;
    }

    // Animated energy pulse
    if (pulseRef.current && curveRef.current) {
      const t = (clock.elapsedTime * 0.15 + (line === 'blue' ? 0.33 : line === 'green' ? 0.66 : 0)) % 1;
      const pt = curveRef.current.getPointAt(t);
      pulseRef.current.position.copy(pt);
      pulseRef.current.position.y = 0.5;
      pulseRef.current.visible = true;
      const pScale = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
      pulseRef.current.scale.setScalar(pScale);
    }
  });

  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -100, 0), new THREE.Vector3(1, -100, 0)
  ]), []);

  return (
    <group>
      <mesh ref={meshRef}>
        <tubeGeometry args={[initCurve, 2, 0.7, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={glowRef}>
        <tubeGeometry args={[initCurve, 2, 1.5, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {/* Energy pulse sphere */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[1.0, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
