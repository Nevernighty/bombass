import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { STATIONS, toWorld } from '../constants';
import { GameState } from '../types';

const BUILDINGS_PER_STATION = 3;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

interface BuildingDef {
  x: number; y: number; wx: number; wz: number;
  h: number; w: number; d: number;
  type: 'tower' | 'apartment' | 'commercial';
  stationId: string; districtName: string;
}

interface DebrisParticle {
  pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number;
}

interface SmokeParticle {
  pos: THREE.Vector3; life: number; maxLife: number; scale: number;
}

function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const DISTRICT_NAMES: Record<string, string> = {
  'r1': 'Академмістечко', 'r2': 'Житомирська', 'r3': 'Святошин', 'r4': 'Нивки',
  'r5': 'Берестейська', 'r6': 'Шулявська', 'r7': 'КПІ', 'r8': 'Вокзальна',
  'r9': 'Університет', 'r10': 'Театральна', 'r11': 'Хрещатик', 'r12': 'Арсенальна',
  'r13': 'Дніпро', 'r14': 'Гідропарк', 'r15': 'Лівобережна', 'r16': 'Дарниця',
  'r17': 'Чернігівська', 'r18': 'Лісова',
  'b1': 'Героїв Дніпра', 'b2': 'Мінська', 'b3': 'Оболонь', 'b4': 'Почайна',
  'b5': 'Т. Шевченка', 'b6': 'Контрактова', 'b7': 'Поштова', 'b8': 'Майдан',
  'b9': 'Пл. Героїв', 'b10': 'Олімпійська', 'b11': 'Палац Україна', 'b12': 'Либідська',
  'b13': 'Деміївська', 'b14': 'Голосіївська', 'b15': 'Васильківська', 'b16': 'Іподром',
  'g1': 'Сирець', 'g2': 'Дорогожичі', 'g3': "Лук'янівська", 'g4': 'Золоті ворота',
  'g5': 'Палац спорту', 'g6': 'Кловська', 'g7': 'Печерська', 'g8': 'Дружби народів',
  'g9': 'Видубичі', 'g10': 'Славутич', 'g11': 'Осокорки', 'g12': 'Позняки',
  'g13': 'Харківська', 'g14': 'Вирлиця', 'g15': 'Бориспільська',
};

export function generateBuildingData(): BuildingDef[] {
  const rand = makeRng(42);
  const buildings: BuildingDef[] = [];

  // Select ~15 stations spread across the map for building clusters
  const stationSubset = STATIONS.filter((_, i) => i % 3 === 0 || STATIONS[i].isTransfer);

  for (const station of stationSubset) {
    const [sx, , sz] = toWorld(station.x, station.y);
    const count = station.isTransfer ? 4 : BUILDINGS_PER_STATION;

    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2 + rand() * 0.8;
      const dist = 5 + rand() * 6;
      const wx = sx + Math.cos(angle) * dist;
      const wz = sz + Math.sin(angle) * dist;

      // Building type
      const roll = rand();
      let type: 'tower' | 'apartment' | 'commercial';
      let h: number, w: number, d: number;
      if (roll < 0.2) {
        type = 'tower'; h = 6 + rand() * 5; w = 1.5 + rand() * 1; d = 1.5 + rand() * 1;
      } else if (roll < 0.6) {
        type = 'apartment'; h = 3 + rand() * 3; w = 2.5 + rand() * 2; d = 2 + rand() * 1.5;
      } else {
        type = 'commercial'; h = 1 + rand() * 1.5; w = 2 + rand() * 2.5; d = 2 + rand() * 2;
      }

      buildings.push({
        x: (wx / 200) + 0.5, y: (wz / 160) + 0.5,
        wx, wz, h, w, d, type,
        stationId: station.id,
        districtName: DISTRICT_NAMES[station.id] || station.nameUa,
      });
    }

    if (buildings.length >= 45) break;
  }

  return buildings;
}

const BUILDING_DATA = generateBuildingData();

// Color palette per building type
function getBuildingColor(type: string, rand: () => number): THREE.Color {
  if (type === 'tower') {
    return new THREE.Color().setHSL(210 / 360, 0.08 + rand() * 0.1, 0.15 + rand() * 0.08);
  } else if (type === 'apartment') {
    return new THREE.Color().setHSL(30 / 360, 0.05 + rand() * 0.08, 0.18 + rand() * 0.1);
  }
  return new THREE.Color().setHSL(180 / 360, 0.04 + rand() * 0.06, 0.2 + rand() * 0.08);
}

interface CityBuildingsProps {
  stateRef?: React.MutableRefObject<GameState>;
}

export function CityBuildings({ stateRef }: CityBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowMeshRef = useRef<THREE.InstancedMesh>(null);
  const [tooltip, setTooltip] = useState<{ idx: number; name: string; hp: number; maxHp: number } | null>(null);

  // Debris particles
  const debrisRef = useRef<DebrisParticle[]>([]);
  const debrisInstanceRef = useRef<THREE.InstancedMesh>(null);
  const MAX_DEBRIS = 80;

  // Smoke particles
  const smokeRef = useRef<SmokeParticle[]>([]);
  const smokeInstanceRef = useRef<THREE.InstancedMesh>(null);
  const MAX_SMOKE = 30;

  // Track previous destroy state
  const prevDestroyedRef = useRef<Set<number>>(new Set());

  const baseColors = useMemo(() => {
    const rand = makeRng(99);
    return BUILDING_DATA.map(b => getBuildingColor(b.type, rand));
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

    // Window planes: 2 rows per building
    if (windowMeshRef.current) {
      let wIdx = 0;
      BUILDING_DATA.forEach((b) => {
        for (let row = 0; row < 2; row++) {
          const yPos = b.h * (0.35 + row * 0.3);
          // Front face
          tempObject.position.set(b.wx, yPos, b.wz + b.d / 2 + 0.02);
          tempObject.scale.set(b.w * 0.85, b.h * 0.08, 0.01);
          tempObject.rotation.set(0, 0, 0);
          tempObject.updateMatrix();
          if (wIdx < BUILDING_DATA.length * 2) {
            windowMeshRef.current!.setMatrixAt(wIdx, tempObject.matrix);
            wIdx++;
          }
        }
      });
      windowMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Init debris instances off-screen
    if (debrisInstanceRef.current) {
      for (let i = 0; i < MAX_DEBRIS; i++) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        debrisInstanceRef.current.setMatrixAt(i, tempObject.matrix);
      }
      debrisInstanceRef.current.instanceMatrix.needsUpdate = true;
    }

    // Init smoke instances off-screen
    if (smokeInstanceRef.current) {
      for (let i = 0; i < MAX_SMOKE; i++) {
        tempObject.position.set(0, -100, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        smokeInstanceRef.current.setMatrixAt(i, tempObject.matrix);
      }
      smokeInstanceRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [baseColors]);

  useFrame((_, delta) => {
    if (!meshRef.current || !stateRef) return;
    const state = stateRef.current;
    if (!state.buildings || state.buildings.length === 0) return;

    let needsUpdate = false;

    for (let i = 0; i < state.buildings.length && i < BUILDING_DATA.length; i++) {
      const bs = state.buildings[i];
      const b = BUILDING_DATA[i];

      if (bs.isDestroyed) {
        // Spawn debris when newly destroyed
        if (!prevDestroyedRef.current.has(i)) {
          prevDestroyedRef.current.add(i);
          // Spawn 10 debris particles
          for (let d = 0; d < 10; d++) {
            const angle = (d / 10) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 3 + Math.random() * 5;
            debrisRef.current.push({
              pos: new THREE.Vector3(b.wx + (Math.random() - 0.5) * b.w, b.h * 0.5, b.wz + (Math.random() - 0.5) * b.d),
              vel: new THREE.Vector3(Math.cos(angle) * speed, 4 + Math.random() * 6, Math.sin(angle) * speed),
              life: 2.0, maxLife: 2.0,
            });
          }
          // Spawn smoke
          for (let s = 0; s < 3; s++) {
            smokeRef.current.push({
              pos: new THREE.Vector3(b.wx + (Math.random() - 0.5) * 1, 0.5, b.wz + (Math.random() - 0.5) * 1),
              life: 4.0, maxLife: 4.0, scale: 0.5,
            });
          }
        }

        // Flatten destroyed building
        tempObject.position.set(b.wx, 0.05, b.wz);
        tempObject.scale.set(b.w * 1.1, 0.1, b.d * 1.1);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        tempColor.set('#1a0f05');
        meshRef.current!.setColorAt(i, tempColor);
        needsUpdate = true;
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

        // Add smoke for damaged buildings
        if (ratio < 0.5 && Math.random() < delta * 0.5) {
          if (smokeRef.current.length < MAX_SMOKE) {
            smokeRef.current.push({
              pos: new THREE.Vector3(b.wx, h, b.wz),
              life: 3.0, maxLife: 3.0, scale: 0.3,
            });
          }
        }
      }
    }

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }

    // Update debris particles
    if (debrisInstanceRef.current) {
      const debris = debrisRef.current;
      // Remove dead
      for (let i = debris.length - 1; i >= 0; i--) {
        debris[i].life -= delta;
        if (debris[i].life <= 0) debris.splice(i, 1);
      }
      // Limit
      while (debris.length > MAX_DEBRIS) debris.shift();

      for (let i = 0; i < MAX_DEBRIS; i++) {
        if (i < debris.length) {
          const d = debris[i];
          d.vel.y -= 15 * delta; // gravity
          d.pos.addScaledVector(d.vel, delta);
          if (d.pos.y < 0.1) { d.pos.y = 0.1; d.vel.y *= -0.3; d.vel.x *= 0.8; d.vel.z *= 0.8; }
          const s = 0.15 + (d.life / d.maxLife) * 0.2;
          tempObject.position.copy(d.pos);
          tempObject.scale.set(s, s * 0.7, s);
          tempObject.rotation.set(d.life * 8, d.life * 5, d.life * 3);
          tempObject.updateMatrix();
          debrisInstanceRef.current.setMatrixAt(i, tempObject.matrix);
          tempColor.setHSL(30 / 360, 0.2, 0.1 + (1 - d.life / d.maxLife) * 0.05);
          debrisInstanceRef.current.setColorAt(i, tempColor);
        } else {
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          debrisInstanceRef.current.setMatrixAt(i, tempObject.matrix);
        }
      }
      debrisInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (debrisInstanceRef.current.instanceColor) debrisInstanceRef.current.instanceColor.needsUpdate = true;
    }

    // Update smoke particles
    if (smokeInstanceRef.current) {
      const smokes = smokeRef.current;
      for (let i = smokes.length - 1; i >= 0; i--) {
        smokes[i].life -= delta;
        if (smokes[i].life <= 0) smokes.splice(i, 1);
      }
      while (smokes.length > MAX_SMOKE) smokes.shift();

      for (let i = 0; i < MAX_SMOKE; i++) {
        if (i < smokes.length) {
          const s = smokes[i];
          s.pos.y += delta * 2;
          s.pos.x += (Math.random() - 0.5) * delta * 0.5;
          s.scale += delta * 0.8;
          const alpha = s.life / s.maxLife;
          tempObject.position.copy(s.pos);
          tempObject.scale.set(s.scale, s.scale, s.scale);
          tempObject.updateMatrix();
          smokeInstanceRef.current.setMatrixAt(i, tempObject.matrix);
        } else {
          tempObject.position.set(0, -100, 0);
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          smokeInstanceRef.current.setMatrixAt(i, tempObject.matrix);
        }
      }
      smokeInstanceRef.current.instanceMatrix.needsUpdate = true;
    }

    // Window emissive
    if (windowMeshRef.current) {
      const mat = windowMeshRef.current.material as THREE.MeshStandardMaterial;
      const isNight = state.isNight;
      mat.emissiveIntensity = isNight ? 1.5 : 0.2;
      mat.opacity = isNight ? 0.8 : 0.3;
      mat.emissive.set(isNight ? '#ffaa44' : '#88aacc');
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!stateRef || !meshRef.current) return;
    const instanceId = e.instanceId;
    if (instanceId === undefined || instanceId >= BUILDING_DATA.length) return;
    e.stopPropagation();

    const b = BUILDING_DATA[instanceId];
    const bs = stateRef.current.buildings[instanceId];
    if (!bs) return;

    setTooltip(prev =>
      prev?.idx === instanceId ? null :
      { idx: instanceId, name: b.districtName, hp: bs.hp, maxHp: bs.maxHp }
    );
  };

  // Update tooltip HP reactively
  useFrame(() => {
    if (tooltip && stateRef) {
      const bs = stateRef.current.buildings[tooltip.idx];
      if (bs && (bs.hp !== tooltip.hp)) {
        setTooltip(t => t ? { ...t, hp: bs.hp } : null);
      }
    }
  });

  return (
    <group>
      {/* Buildings */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BUILDING_DATA.length]}
        castShadow receiveShadow frustumCulled={false}
        onClick={handleClick}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.35} roughness={0.7} />
      </instancedMesh>

      {/* Window glow rows */}
      <instancedMesh ref={windowMeshRef} args={[undefined, undefined, BUILDING_DATA.length * 2]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#000000" emissive="#ffaa44" emissiveIntensity={0.6} transparent opacity={0.4} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Debris particles */}
      <instancedMesh ref={debrisInstanceRef} args={[undefined, undefined, MAX_DEBRIS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.2} roughness={0.9} />
      </instancedMesh>

      {/* Smoke particles */}
      <instancedMesh ref={smokeInstanceRef} args={[undefined, undefined, MAX_SMOKE]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#222222" transparent opacity={0.35} />
      </instancedMesh>

      {/* Tooltip billboard */}
      {tooltip && BUILDING_DATA[tooltip.idx] && (
        <Billboard position={[BUILDING_DATA[tooltip.idx].wx, BUILDING_DATA[tooltip.idx].h + 1.5, BUILDING_DATA[tooltip.idx].wz]}>
          <Text fontSize={0.5} color="#ffffff" outlineWidth={0.05} outlineColor="#000000" anchorX="center" anchorY="middle">
            {tooltip.name}
          </Text>
          <Text fontSize={0.35} color={tooltip.hp > tooltip.maxHp * 0.5 ? '#44ff44' : '#ff4444'} position={[0, -0.5, 0]} outlineWidth={0.03} outlineColor="#000000" anchorX="center" anchorY="middle">
            {`HP: ${tooltip.hp}/${tooltip.maxHp}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
