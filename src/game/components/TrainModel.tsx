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

const TRAIN_SCALE = 0.4;
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

interface BoardingDot {
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
}

export function TrainModel({ trainId, stateRef, onClick }: TrainModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothPos = useRef(new THREE.Vector3(0, TRAIN_BASE_Y, 0));
  const smoothAngle = useRef<number | null>(null);
  const lastMovementAngle = useRef<number>(0);
  const shieldMeshRef = useRef<THREE.Mesh>(null);
  const boardingDotsRef = useRef<BoardingDot[]>([]);
  const dotMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const wasDwelling = useRef(false);
  const isHoveredRef = useRef(false);
  const bobPhase = useRef(0);

  const train = useMemo(() => stateRef.current.trains.find(t => t.id === trainId), [trainId]);
  if (!train) return null;

  const lineColor = METRO_LINES[train.line].color;
  const lineName = train.line === 'red' ? 'M1' : train.line === 'blue' ? 'M2' : 'M3';

  useFrame((_, delta) => {
    const state = stateRef.current;
    const t = state.trains.find(tr => tr.id === trainId);
    if (!t || !groupRef.current) return;

    const route = getActiveLineStations(state, t.line);
    const currentStationId = route[t.routeIndex];
    const nextIdx = Math.max(0, Math.min(route.length - 1, t.routeIndex + t.direction));
    const nextStationId = route[nextIdx];
    const currentIsBridge = BRIDGE_STATION_IDS.has(currentStationId);
    const nextIsBridge = BRIDGE_STATION_IDS.has(nextStationId);

    const [wx, , wz] = toWorld(t.x, t.y);
    let targetY = TRAIN_BASE_Y;
    if (currentIsBridge && nextIsBridge) {
      targetY = BRIDGE_Y;
    } else if (currentIsBridge || nextIsBridge) {
      targetY = TRAIN_BASE_Y + (BRIDGE_Y - TRAIN_BASE_Y) * (currentIsBridge ? (1 - t.progress) : t.progress);
    }

    // Dwelling bob animation
    if (t.isDwelling) {
      bobPhase.current += delta * 4;
      targetY += Math.sin(bobPhase.current) * 0.08;
    } else {
      bobPhase.current = 0;
    }

    const targetPos = new THREE.Vector3(wx, targetY, wz);

    const springFactor = 1 - Math.exp(-8 * delta);
    smoothPos.current.lerp(targetPos, springFactor);
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
    smoothAngle.current += diff * (1 - Math.exp(-6 * delta));
    groupRef.current.rotation.y = smoothAngle.current;

    // Boarding dots animation
    if (t.isDwelling && !wasDwelling.current) {
      const curSt = STATION_MAP.get(currentStationId);
      if (curSt) {
        const [sx, , sz] = toWorld(curSt.x, curSt.y);
        boardingDotsRef.current = [];
        const dotCount = Math.min(3, t.passengers.length + 1);
        for (let d = 0; d < dotCount; d++) {
          const angle = (d / dotCount) * Math.PI * 2;
          boardingDotsRef.current.push({
            start: new THREE.Vector3(sx + Math.cos(angle) * 2, 0.5, sz + Math.sin(angle) * 2),
            end: new THREE.Vector3(wx, targetY + 0.3, wz),
            progress: 0,
          });
        }
      }
    }
    wasDwelling.current = t.isDwelling;

    for (let i = 0; i < 3; i++) {
      const dot = boardingDotsRef.current[i];
      const mesh = dotMeshRefs.current[i];
      if (dot && mesh) {
        dot.progress = Math.min(1, dot.progress + delta * 2);
        const p = dot.progress;
        mesh.position.lerpVectors(dot.start, dot.end, p);
        mesh.position.y += Math.sin(p * Math.PI) * 0.8;
        mesh.visible = p < 1;
        mesh.scale.setScalar(0.12 * (1 - p * 0.5));
      } else if (mesh) {
        mesh.visible = false;
      }
    }

    // Shield
    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = t.shieldTimer > 0;
      if (t.shieldTimer > 0) {
        (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(Date.now() * 0.004) * 0.06;
        shieldMeshRef.current.rotation.y += delta * 0.8;
      }
    }

    // Hover tooltip
    if (isHoveredRef.current) {
      stateRef.current.hoveredElement = {
        type: 'train',
        id: trainId,
        name: `${lineName} Потяг Lv.${t.level}`,
        details: `${t.passengers.length}/${t.capacity} пасажирів | ${t.isDwelling ? 'На станції' : 'В русі'}`,
      };
    }
  });

  const isSelected = stateRef.current.selectedTrain === trainId;
  const fillRatio = train.passengers.length / train.capacity;
  const ringColor = fillRatio > 0.8 ? '#ff4444' : fillRatio > 0.4 ? '#ffaa00' : '#44ff44';

  // Wagon chain: extra wagons behind for upgraded trains
  const wagonCount = Math.min(train.level, 3);

  return (
    <group
      ref={groupRef}
      renderOrder={20}
      onClick={(e) => { e.stopPropagation(); onClick?.(trainId); }}
      onPointerEnter={() => {
        isHoveredRef.current = true;
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        isHoveredRef.current = false;
        document.body.style.cursor = 'default';
        if (stateRef.current.hoveredElement?.type === 'train') {
          stateRef.current.hoveredElement = null;
        }
      }}
    >
      {/* Lead wagon */}
      <GLBTrain lineColor={lineColor} />

      {/* Additional wagons for upgraded trains */}
      {wagonCount > 1 && Array.from({ length: wagonCount - 1 }).map((_, i) => (
        <group key={`wagon-${i}`} position={[0, 0, -(i + 1) * 1.2]}>
          <GLBTrain lineColor={lineColor} />
        </group>
      ))}

      {/* Ground shadow */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Capacity ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshBasicMaterial color={ringColor} transparent opacity={fillRatio > 0 ? 0.5 : 0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Shield sphere */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[1.2, 10, 10]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.85, 16]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Boarding dots */}
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={el => { dotMeshRefs.current[i] = el; }} visible={false}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}

      {/* Labels */}
      <Billboard>
        <Text position={[0, 1.5, 0]} fontSize={0.5} color={lineColor} anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000000" fontWeight="bold">
          {lineName}
        </Text>
        <Text position={[0, 0.95, 0]} fontSize={0.3} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {`${train.passengers.length}/${train.capacity}`}
        </Text>
        {train.level > 1 && (
          <Text position={[0, 0.55, 0]} fontSize={0.22} color="#fbbf24" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
            {'★'.repeat(train.level)}
          </Text>
        )}
      </Billboard>

      <pointLight color={lineColor} intensity={0.6} distance={4} position={[0, 0.15, 0.4]} />
    </group>
  );
}
