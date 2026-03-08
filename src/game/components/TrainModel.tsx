import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { METRO_LINES, STATION_MAP, toWorld } from '../constants';
import { getActiveLineStations } from '../GameEngine';

interface TrainModelProps {
  trainId: string;
  stateRef: React.MutableRefObject<GameState>;
  onClick?: (id: string) => void;
}

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
          mat.color.lerp(lineCol, 0.5);
          mat.emissive = lineCol;
          mat.emissiveIntensity = 0.4;
          mesh.material = mat;
        }
      }
    });
    return s;
  }, [scene, lineColor]);

  return <primitive object={cloned} scale={[0.6, 0.6, 0.6]} />;
}

useGLTF.preload('/models/metro_wagon_type_d.glb');

export function TrainModel({ trainId, stateRef, onClick }: TrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3(0, 0.7, 0));
  const smoothAngle = useRef<number | null>(null);
  const lastMovementAngle = useRef<number>(0);
  const shieldMeshRef = useRef<THREE.Mesh>(null);
  const hoverGlowRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const isHoveredRef = useRef(false);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;
  const lineName = train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3';

  useFrame((_, delta) => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    const [wx, , wz] = toWorld(t.x, t.y);
    const targetPos = new THREE.Vector3(wx, 0.7, wz);

    const lerpFactor = Math.min(1, delta * 14);
    smoothPos.current.lerp(targetPos, lerpFactor);
    groupRef.current.position.copy(smoothPos.current);

    if (!t.isDwelling) {
      const route = getActiveLineStations(state, t.line);
      if (route.length >= 2) {
        const curIdx = t.routeIndex;
        const nextIdx = Math.max(0, Math.min(route.length - 1, curIdx + t.direction));
        const curSt = STATION_MAP.get(route[curIdx]);
        const nextSt = STATION_MAP.get(route[nextIdx]);
        if (curSt && nextSt && curSt.id !== nextSt.id) {
          const [cx, , cz] = toWorld(curSt.x, curSt.y);
          const [nx, , nz] = toWorld(nextSt.x, nextSt.y);
          lastMovementAngle.current = Math.atan2(nx - cx, nz - cz);
        }
      }
    }

    const targetAngle = lastMovementAngle.current;
    if (smoothAngle.current === null) smoothAngle.current = targetAngle;
    let diff = targetAngle - smoothAngle.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    smoothAngle.current += diff * 0.4;
    groupRef.current.rotation.y = smoothAngle.current;

    if (t.isDwelling) {
      groupRef.current.position.y = 0.7 + Math.sin(Date.now() * 0.005) * 0.06;
    }

    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = t.shieldTimer > 0;
      if (t.shieldTimer > 0) {
        (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(Date.now() * 0.004) * 0.08;
        shieldMeshRef.current.rotation.y += delta * 0.8;
      }
    }

    if (hoverGlowRef.current) {
      hoverGlowRef.current.visible = isHoveredRef.current;
    }

    // Animate glow ring
    if (glowRingRef.current) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.003) * 0.2;
      (glowRingRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Shadow follows position
    if (shadowRef.current) {
      shadowRef.current.position.set(0, -0.65, 0);
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;
  const fillRatio = train.passengers.length / train.capacity;
  const capacityColor = fillRatio > 0.8 ? '#ff4444' : fillRatio > 0.4 ? '#ffaa00' : '#44ff44';
  const isNight = stateRef.current.isNight;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
      onPointerEnter={() => { isHoveredRef.current = true; document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { isHoveredRef.current = false; document.body.style.cursor = 'default'; }}
    >
      <GLBTrain lineColor={lineColor} />

      {/* Ground shadow disc */}
      <mesh ref={shadowRef} position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Ground glow ring */}
      <mesh ref={glowRingRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.5, 24]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Capacity bar */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.6, 0.08, 1.5 * Math.max(0.1, fillRatio)]} />
        <meshStandardMaterial color={capacityColor} emissive={capacityColor} emissiveIntensity={0.7} transparent opacity={0.85} />
      </mesh>

      {/* Hover glow ring */}
      <mesh ref={hoverGlowRef} position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.3, 1.8, 16]} />
        <meshBasicMaterial color={lineColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Shield sphere */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[2.0, 12, 12]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.8, 24]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Always-visible line label + passenger count */}
      <Billboard>
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.7}
          color={lineColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#000000"
          fontWeight="bold"
        >
          {lineName}
        </Text>
        <Text
          position={[0, 1.6, 0]}
          fontSize={0.45}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {`${train.passengers.length}/${train.capacity}`}
        </Text>
      </Billboard>

      {/* Interior window glow */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.15, 1.0]} />
        <meshBasicMaterial color={isNight ? '#ffcc66' : '#ffffff'} transparent opacity={isNight ? 0.25 : 0.08} />
      </mesh>

      {/* Headlights */}
      <pointLight color={isNight ? '#ffcc88' : lineColor} intensity={isNight ? 2.0 : 1.0} distance={isNight ? 8 : 4} position={[0, 0.3, 1.2]} />
      {isNight && <pointLight color="#ffaa66" intensity={0.5} distance={3} position={[0, 0.2, 0]} />}
    </group>
  );
}
