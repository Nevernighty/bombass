import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld, BRIDGE_STATION_IDS } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface TrainModelProps {
  trainId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

const TRAIN_SCALE = 0.25;
const TRAIN_BASE_Y = 0.35;
const BRIDGE_Y = 3.8;

function GLBTrain({ lineColor }: { lineColor: string }) {
  const { scene } = useGLTF('/models/metro_wagon_type_d.glb');
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          const lineCol = new THREE.Color(lineColor);
          mat.color.lerp(lineCol, 0.4);
          mat.emissive = lineCol;
          mat.emissiveIntensity = 0.3;
          mesh.material = mat;
        }
      }
    });
    return s;
  }, [scene, lineColor]);

  return <primitive object={cloned} scale={[TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE]} />;
}

useGLTF.preload('/models/metro_wagon_type_d.glb');

export function TrainModel({ trainId, stateRef, onClick }: TrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3(0, TRAIN_BASE_Y, 0));
  const smoothAngle = useRef<number | null>(null);
  const lastMovementAngle = useRef<number>(0);
  const shieldMeshRef = useRef<THREE.Mesh>(null);
  const isHoveredRef = useRef(false);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;
  const lineName = train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3';

  useFrame((_, delta) => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    // Determine if train is on a bridge station
    const route = getActiveLineStations(state, t.line);
    const currentStationId = route[t.routeIndex];
    const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
    const nextStationId = route[nextIdx];
    const currentIsBridge = BRIDGE_STATION_IDS.has(currentStationId);
    const nextIsBridge = BRIDGE_STATION_IDS.has(nextStationId);

    const [wx, , wz] = toWorld(t.x, t.y);
    // Interpolate height for bridge transitions
    let targetY = TRAIN_BASE_Y;
    if (currentIsBridge && nextIsBridge) {
      targetY = BRIDGE_Y;
    } else if (currentIsBridge || nextIsBridge) {
      targetY = TRAIN_BASE_Y + (BRIDGE_Y - TRAIN_BASE_Y) * (currentIsBridge ? (1 - t.progress) : t.progress);
    }

    const targetPos = new THREE.Vector3(wx, targetY, wz);
    const lerpFactor = Math.min(1, delta * 10);
    smoothPos.current.lerp(targetPos, lerpFactor);
    groupRef.current.position.copy(smoothPos.current);

    // Rotation toward next station
    if (!t.isDwelling && route.length >= 2) {
      const curIdx = t.routeIndex;
      const nIdx = Math.max(0, Math.min(route.length - 1, curIdx + t.direction));
      const curSt = STATION_MAP.get(route[curIdx]);
      const nextSt = STATION_MAP.get(route[nIdx]);
      if (curSt && nextSt && curSt.id !== nextSt.id) {
        const [cx, , cz] = toWorld(curSt.x, curSt.y);
        const [nx, , nz] = toWorld(nextSt.x, nextSt.y);
        lastMovementAngle.current = Math.atan2(nx - cx, nz - cz);
      }
    }

    const targetAngle = lastMovementAngle.current;
    if (smoothAngle.current === null) smoothAngle.current = targetAngle;
    let diff = targetAngle - smoothAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothAngle.current += diff * 0.4;
    groupRef.current.rotation.y = smoothAngle.current;

    // Shield
    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = t.shieldTimer > 0;
      if (t.shieldTimer > 0) {
        (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(Date.now() * 0.004) * 0.06;
        shieldMeshRef.current.rotation.y += delta * 0.8;
      }
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;
  const fillRatio = train.passengers.length / train.capacity;
  const capacityColor = fillRatio > 0.8 ? '#ff4444' : fillRatio > 0.4 ? '#ffaa00' : '#44ff44';

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
      onPointerEnter={() => { isHoveredRef.current = true; document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { isHoveredRef.current = false; document.body.style.cursor = 'default'; }}
    >
      <GLBTrain lineColor={lineColor} />

      {/* Small ground shadow */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Subtle ground glow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.6, 16]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Capacity indicator bar */}
      {fillRatio > 0 && (
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.15, 0.03, 0.5 * Math.max(0.1, fillRatio)]} />
          <meshStandardMaterial color={capacityColor} emissive={capacityColor} emissiveIntensity={0.5} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Shield sphere */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[1.0, 10, 10]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 16]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Labels */}
      <Billboard>
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.4}
          color={lineColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
          fontWeight="bold"
        >
          {lineName}
        </Text>
        <Text
          position={[0, 0.75, 0]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`${train.passengers.length}/${train.capacity}`}
        </Text>
      </Billboard>

      {/* Headlight */}
      <pointLight color={lineColor} intensity={0.5} distance={3} position={[0, 0.15, 0.4]} />
    </group>
  );
}
