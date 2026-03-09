import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld, BRIDGE_STATION_IDS } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface MetroLine3DProps {
  line: string;
  stateRef: React.MutableRefObject<GameState>;
}

const TUBE_RADIUS = 0.30;
const GLOW_RADIUS = 0.50;
const BASE_HEIGHT = 1.0;
const BRIDGE_HEIGHT = 4.5;

export function MetroLine3D({ line, stateRef }: MetroLine3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const glowGeometryRef = useRef<THREE.TubeGeometry | null>(null);
  const prevPointsKey = useRef('');
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const isHoveredRef = useRef(false);
  const hoverLabelRef = useRef<THREE.Group>(null);

  const { color } = METRO_LINES[line];
  const lineName = line === 'red' ? 'M1' : line === 'blue' ? 'M2' : 'M3';

  useFrame(({ clock }) => {
    const state = stateRef.current;
    const activeIds = getActiveLineStations(state, line);

    if (activeIds.length < 2) {
      if (meshRef.current) meshRef.current.visible = false;
      if (glowRef.current) glowRef.current.visible = false;
      if (pulseRef.current) pulseRef.current.visible = false;
      return;
    }

    const key = activeIds.join(',');
    if (key !== prevPointsKey.current) {
      prevPointsKey.current = key;

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
      curveRef.current = curve;

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

    const hoverBoost = isHoveredRef.current ? 0.5 : 0;

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.isNight ? 0.35 + hoverBoost * 0.15 : 0.2 + hoverBoost * 0.15;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (state.isNight ? 1.0 : 0.7) + hoverBoost;
    }

    if (hoverLabelRef.current) {
      hoverLabelRef.current.visible = isHoveredRef.current;
      if (isHoveredRef.current && curveRef.current) {
        const mid = curveRef.current.getPoint(0.5);
        hoverLabelRef.current.position.copy(mid);
        hoverLabelRef.current.position.y += 4;
      }
    }

    // Animated energy pulse
    if (pulseRef.current && curveRef.current) {
      const t = (clock.elapsedTime * 0.33 + (line === 'red' ? 0 : line === 'blue' ? 1 : 2)) % 1;
      const pos = curveRef.current.getPoint(t);
      pulseRef.current.position.copy(pos);
      pulseRef.current.visible = true;
      const scale = 0.5 + Math.sin(clock.elapsedTime * 6) * 0.15;
      pulseRef.current.scale.set(scale, scale, scale);
    }
  });

  const initCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, BASE_HEIGHT, 0), new THREE.Vector3(1, BASE_HEIGHT, 0)
  ]), []);

  // Closed segment X markers
  const closedSegmentPositions = useMemo(() => {
    const state = stateRef.current;
    const markers: THREE.Vector3[] = [];
    for (const seg of state.closedSegments) {
      if (seg.line !== line) continue;
      const fromSt = STATION_MAP.get(seg.from);
      const toSt = STATION_MAP.get(seg.to);
      if (fromSt && toSt) {
        const [fx, , fz] = toWorld(fromSt.x, fromSt.y);
        const [tx, , tz] = toWorld(toSt.x, toSt.y);
        markers.push(new THREE.Vector3((fx + tx) / 2, BASE_HEIGHT + 2, (fz + tz) / 2));
      }
    }
    return markers;
  }, [stateRef.current.closedSegments.length, line]);

  return (
    <group>
      {/* Main tube — depthTest false ensures always on top */}
      <mesh
        ref={meshRef}
        visible={false}
        renderOrder={10}
        onPointerEnter={() => { isHoveredRef.current = true; document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { isHoveredRef.current = false; document.body.style.cursor = 'default'; }}
      >
        <tubeGeometry args={[initCurve, 4, TUBE_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          metalness={0.4}
          roughness={0.3}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Glow tube */}
      <mesh ref={glowRef} visible={false} renderOrder={10}>
        <tubeGeometry args={[initCurve, 4, GLOW_RADIUS, 8, false]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Energy pulse */}
      <mesh ref={pulseRef} visible={false} renderOrder={12}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthTest={false} />
      </mesh>

      {/* Hover label */}
      <group ref={hoverLabelRef} visible={false}>
        <Billboard>
          <Text fontSize={1.4} color={color} anchorX="center" anchorY="middle"
            outlineWidth={0.1} outlineColor="#000000" fontWeight="bold">
            {lineName}
          </Text>
        </Billboard>
      </group>

      {/* Closed segment X markers */}
      {closedSegmentPositions.map((pos, i) => (
        <group key={`closed-${i}`} position={pos}>
          <mesh rotation={[0, 0, Math.PI / 4]} renderOrder={15}>
            <boxGeometry args={[2.5, 0.3, 0.3]} />
            <meshBasicMaterial color="#ef4444" depthTest={false} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]} renderOrder={15}>
            <boxGeometry args={[2.5, 0.3, 0.3]} />
            <meshBasicMaterial color="#ef4444" depthTest={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} renderOrder={14}>
            <ringGeometry args={[1.5, 2.0, 12]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.4} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          <Billboard>
            <Text fontSize={0.6} color="#ef4444" position={[0, 1.5, 0]} anchorX="center" outlineWidth={0.04} outlineColor="#000">
              ЗАКРИТО
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
}
