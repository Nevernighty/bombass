import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIONS, toWorld } from '../constants';
import { GameState } from '../types';

const BUILDING_COUNT = 120;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

// Deterministic RNG
function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Generate building data deterministically — shared between component and GameEngine
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

interface CityBuildingsProps {
  stateRef?: React.MutableRefObject<GameState>;
}

export function CityBuildings({ stateRef }: CityBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowMeshRef = useRef<THREE.InstancedMesh>(null);
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

  // Initialize instances
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
        // Darken damaged buildings
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
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BUILDING_DATA.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          metalness={0.15}
          roughness={0.85}
          emissive="#332200"
          emissiveIntensity={0.15}
        />
      </instancedMesh>
    </group>
  );
}
