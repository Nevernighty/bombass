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
  const buildings: { x: number; y: number; h: number; w: number; d: number; wx: number; wz: number }[] = [];

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

    const h = 0.3 + rand() * 5;
    const w = 0.5 + rand() * 1.8;
    const d = 0.5 + rand() * 1.8;

    buildings.push({ x: nx, y: ny, h, w, d, wx, wz });
  }
  return buildings;
}

const BUILDING_DATA = generateBuildingData();

// Generate streetlight positions
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

interface CityBuildingsProps {
  stateRef?: React.MutableRefObject<GameState>;
}

export function CityBuildings({ stateRef }: CityBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightPoleRef = useRef<THREE.InstancedMesh>(null);
  const lightGlowRef = useRef<THREE.InstancedMesh>(null);
  const initialized = useRef(false);

  const { baseColors } = useMemo(() => {
    const rand = makeRng(99);
    const cols: THREE.Color[] = [];
    for (let i = 0; i < BUILDING_DATA.length; i++) {
      const hue = (200 + rand() * 40) / 360;
      const sat = 0.05 + rand() * 0.15;
      const lightness = 0.12 + rand() * 0.18;
      cols.push(new THREE.Color().setHSL(hue, sat, lightness));
    }
    return { baseColors: cols };
  }, []);

  // Initialize building instances
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

    // Initialize window glow instances
    if (windowMeshRef.current) {
      BUILDING_DATA.forEach((b, i) => {
        // Windows on front face
        tempObject.position.set(b.wx, b.h * 0.6, b.wz + b.d / 2 + 0.01);
        tempObject.scale.set(b.w * 0.8, b.h * 0.5, 0.05);
        tempObject.updateMatrix();
        windowMeshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      windowMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Initialize streetlight poles
    if (lightPoleRef.current) {
      STREETLIGHT_DATA.forEach((l, i) => {
        tempObject.position.set(l.wx, 1.5, l.wz);
        tempObject.scale.set(0.08, 3, 0.08);
        tempObject.updateMatrix();
        lightPoleRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      lightPoleRef.current.instanceMatrix.needsUpdate = true;
    }

    // Initialize streetlight glow spheres
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

  // Update buildings based on destruction state
  useFrame(() => {
    if (!meshRef.current || !initialized.current || !stateRef) return;
    const state = stateRef.current;
    if (!state.buildings || state.buildings.length === 0) return;

    let needsUpdate = false;
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
      } else if (bs.hp < bs.maxHp) {
        const ratio = bs.hp / bs.maxHp;
        const h = b.h * ratio;
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
  });

  return (
    <group>
      {/* Buildings */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BUILDING_DATA.length]}
        castShadow receiveShadow frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          metalness={0.15}
          roughness={0.85}
          emissive="#332200"
          emissiveIntensity={0.15}
        />
      </instancedMesh>

      {/* Window glow layer */}
      <instancedMesh
        ref={windowMeshRef}
        args={[undefined, undefined, BUILDING_DATA.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffaa44"
          emissiveIntensity={0.6}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Streetlight poles */}
      <instancedMesh
        ref={lightPoleRef}
        args={[undefined, undefined, STREETLIGHT_DATA.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.5} roughness={0.8} />
      </instancedMesh>

      {/* Streetlight glow */}
      <instancedMesh
        ref={lightGlowRef}
        args={[undefined, undefined, STREETLIGHT_DATA.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial
          color="#ffcc66"
          emissive="#ffaa33"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </instancedMesh>
    </group>
  );
}
