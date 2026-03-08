import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIONS, toWorld } from '../constants';
import { GameState } from '../types';

const BUILDING_COUNT = 120;
const STREETLIGHT_COUNT = 40;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function generateBuildingData() {
  const rand = makeRng(42);
  const buildings: { x: number; y: number; h: number; w: number; d: number; wx: number; wz: number; hasRooftop: boolean; quadrant: number }[] = [];

  for (let i = 0; i < 200 && buildings.length < BUILDING_COUNT; i++) {
    const nx = rand();
    const ny = rand();
    const [wx, , wz] = toWorld(nx, ny);

    const tooClose = STATIONS.some(s => {
      const [sx, , sz] = toWorld(s.x, s.y);
      const dx = wx - sx, dz = wz - sz;
      return Math.sqrt(dx * dx + dz * dz) < 3.5;
    });
    if (tooClose) continue;

    // More height variety: some tall towers, some low
    const roll = rand();
    let h: number;
    if (roll < 0.15) h = 5 + rand() * 3; // tall towers
    else if (roll < 0.4) h = 2 + rand() * 3; // medium
    else h = 0.5 + rand() * 1.5; // low buildings

    const w = 0.5 + rand() * 1.8;
    const d = 0.5 + rand() * 1.8;
    const hasRooftop = rand() < 0.3;
    const quadrant = (nx < 0.5 ? 0 : 1) + (ny < 0.5 ? 0 : 2);

    buildings.push({ x: nx, y: ny, h, w, d, wx, wz, hasRooftop, quadrant });
  }
  return buildings;
}

const BUILDING_DATA = generateBuildingData();

function generateStreetlights() {
  const rand = makeRng(77);
  const lights: { wx: number; wz: number }[] = [];
  for (let i = 0; i < 80 && lights.length < STREETLIGHT_COUNT; i++) {
    const nx = rand();
    const ny = rand();
    const [wx, , wz] = toWorld(nx, ny);
    const tooClose = STATIONS.some(s => {
      const [sx, , sz] = toWorld(s.x, s.y);
      return Math.sqrt((wx - sx) ** 2 + (wz - sz) ** 2) < 3;
    });
    if (tooClose) continue;
    lights.push({ wx, wz });
  }
  return lights;
}

const STREETLIGHT_DATA = generateStreetlights();

// Quadrant-based color palettes
const QUADRANT_PALETTES = [
  { hue: 200, sat: [0.05, 0.15], light: [0.12, 0.22] }, // blue-gray (NW)
  { hue: 220, sat: [0.08, 0.18], light: [0.10, 0.20] }, // slate (NE)
  { hue: 180, sat: [0.04, 0.12], light: [0.14, 0.24] }, // teal-gray (SW)
  { hue: 240, sat: [0.06, 0.14], light: [0.11, 0.19] }, // indigo-gray (SE)
];

interface CityBuildingsProps {
  stateRef?: React.MutableRefObject<GameState>;
}

export function CityBuildings({ stateRef }: CityBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowMeshRef = useRef<THREE.InstancedMesh>(null);
  const rubbleMeshRef = useRef<THREE.InstancedMesh>(null);
  const rooftopMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightPoleRef = useRef<THREE.InstancedMesh>(null);
  const lightGlowRef = useRef<THREE.InstancedMesh>(null);
  const initialized = useRef(false);

  const { baseColors, rooftopCount } = useMemo(() => {
    const rand = makeRng(99);
    const cols: THREE.Color[] = [];
    let rtCount = 0;
    for (let i = 0; i < BUILDING_DATA.length; i++) {
      const b = BUILDING_DATA[i];
      const palette = QUADRANT_PALETTES[b.quadrant];
      const hue = (palette.hue + (rand() - 0.5) * 30) / 360;
      const sat = palette.sat[0] + rand() * (palette.sat[1] - palette.sat[0]);
      const lightness = palette.light[0] + rand() * (palette.light[1] - palette.light[0]);
      cols.push(new THREE.Color().setHSL(hue, sat, lightness));
      if (b.hasRooftop) rtCount++;
    }
    return { baseColors: cols, rooftopCount: rtCount };
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    BUILDING_DATA.forEach((b, i) => {
      tempObject.position.set(b.wx, b.h / 2, b.wz);
      tempObject.scale.set(b.w, b.h, b.d);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      meshRef.current!.setColorAt(i, baseColors[i]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // Multi-level window planes
    if (windowMeshRef.current) {
      BUILDING_DATA.forEach((b, i) => {
        // Window at 60% height
        tempObject.position.set(b.wx, b.h * 0.6, b.wz + b.d / 2 + 0.01);
        tempObject.scale.set(b.w * 0.8, b.h * 0.15, 0.05);
        tempObject.updateMatrix();
        windowMeshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      windowMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Rooftop details (antenna/AC boxes)
    if (rooftopMeshRef.current) {
      let rtIdx = 0;
      BUILDING_DATA.forEach((b) => {
        if (b.hasRooftop) {
          tempObject.position.set(b.wx, b.h + 0.2, b.wz);
          tempObject.scale.set(0.3, 0.4, 0.3);
          tempObject.updateMatrix();
          rooftopMeshRef.current!.setMatrixAt(rtIdx, tempObject.matrix);
          rtIdx++;
        }
      });
      rooftopMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Initialize rubble
    if (rubbleMeshRef.current) {
      for (let i = 0; i < BUILDING_DATA.length; i++) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        rubbleMeshRef.current.setMatrixAt(i, tempObject.matrix);
      }
      rubbleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (lightPoleRef.current) {
      STREETLIGHT_DATA.forEach((l, i) => {
        tempObject.position.set(l.wx, 1.5, l.wz);
        tempObject.scale.set(0.08, 3, 0.08);
        tempObject.updateMatrix();
        lightPoleRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      lightPoleRef.current.instanceMatrix.needsUpdate = true;
    }

    if (lightGlowRef.current) {
      STREETLIGHT_DATA.forEach((l, i) => {
        tempObject.position.set(l.wx, 3.2, l.wz);
        tempObject.scale.set(0.3, 0.3, 0.3);
        tempObject.updateMatrix();
        lightGlowRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      lightGlowRef.current.instanceMatrix.needsUpdate = true;
    }

    initialized.current = true;
  }, [baseColors]);

  useFrame(() => {
    if (!meshRef.current || !initialized.current || !stateRef) return;
    const state = stateRef.current;
    if (!state.buildings || state.buildings.length === 0) return;

    let needsUpdate = false;
    let rubbleNeedsUpdate = false;
    for (let i = 0; i < state.buildings.length && i < BUILDING_DATA.length; i++) {
      const bs = state.buildings[i];
      const b = BUILDING_DATA[i];
      if (bs.isDestroyed) {
        tempObject.position.set(b.wx, 0.05, b.wz);
        tempObject.scale.set(b.w, 0.1, b.d);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        tempColor.set('#1a1008');
        meshRef.current!.setColorAt(i, tempColor);
        needsUpdate = true;

        if (rubbleMeshRef.current) {
          tempObject.position.set(b.wx, 0.15, b.wz);
          tempObject.scale.set(b.w * 1.2, 0.3, b.d * 1.2);
          tempObject.updateMatrix();
          rubbleMeshRef.current.setMatrixAt(i, tempObject.matrix);
          tempColor.set('#2a1a0a');
          rubbleMeshRef.current.setColorAt(i, tempColor);
          rubbleNeedsUpdate = true;
        }
      } else if (bs.hp < bs.maxHp) {
        const ratio = bs.hp / bs.maxHp;
        const h = b.h * (0.3 + ratio * 0.7);
        tempObject.position.set(b.wx, h / 2, b.wz);
        tempObject.scale.set(b.w, h, b.d);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        tempColor.copy(baseColors[i]).lerp(new THREE.Color('#331100'), 1 - ratio);
        meshRef.current!.setColorAt(i, tempColor);
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
    if (rubbleNeedsUpdate && rubbleMeshRef.current) {
      rubbleMeshRef.current.instanceMatrix.needsUpdate = true;
      if (rubbleMeshRef.current.instanceColor) rubbleMeshRef.current.instanceColor.needsUpdate = true;
    }

    // Update window emissive based on night
    if (windowMeshRef.current) {
      const mat = windowMeshRef.current.material as THREE.MeshStandardMaterial;
      const isNight = state.isNight;
      mat.emissiveIntensity = isNight ? 1.2 : 0.3;
      mat.opacity = isNight ? 0.7 : 0.3;
      mat.emissive.set(isNight ? '#ffaa44' : '#88aacc');
    }

    if (lightGlowRef.current) {
      const mat = lightGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.isNight ? 2.5 : 0.5;
      mat.opacity = state.isNight ? 0.9 : 0.3;
    }
  });

  return (
    <group>
      {/* Buildings */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, BUILDING_DATA.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.3} roughness={0.75} emissive="#443300" emissiveIntensity={0.35} />
      </instancedMesh>

      {/* Window glow layer */}
      <instancedMesh ref={windowMeshRef} args={[undefined, undefined, BUILDING_DATA.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#000000" emissive="#ffaa44" emissiveIntensity={0.6} transparent opacity={0.4} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Rooftop details */}
      <instancedMesh ref={rooftopMeshRef} args={[undefined, undefined, rooftopCount]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#333340" metalness={0.4} roughness={0.7} />
      </instancedMesh>

      {/* Rubble */}
      <instancedMesh ref={rubbleMeshRef} args={[undefined, undefined, BUILDING_DATA.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a1a0a" metalness={0.1} roughness={0.95} emissive="#110800" emissiveIntensity={0.1} />
      </instancedMesh>

      {/* Streetlight poles */}
      <instancedMesh ref={lightPoleRef} args={[undefined, undefined, STREETLIGHT_DATA.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.5} roughness={0.8} />
      </instancedMesh>

      {/* Streetlight glow */}
      <instancedMesh ref={lightGlowRef} args={[undefined, undefined, STREETLIGHT_DATA.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial color="#ffcc66" emissive="#ffaa33" emissiveIntensity={1.5} transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
}
