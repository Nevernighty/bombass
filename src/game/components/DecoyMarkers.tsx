import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

function DecoyMarkersInner({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const [decoyIds, setDecoyIds] = React.useState<string[]>([]);
  const prevKey = React.useRef('');

  useFrame(() => {
    const key = stateRef.current.decoys.map(d => d.id).join(',');
    if (key !== prevKey.current) {
      prevKey.current = key;
      setDecoyIds(stateRef.current.decoys.map(d => d.id));
    }
  });

  return (
    <group ref={groupRef}>
      {decoyIds.map(id => (
        <DecoyMesh key={id} decoyId={id} stateRef={stateRef} />
      ))}
    </group>
  );
}

export const DecoyMarkers = React.forwardRef<THREE.Group, { stateRef: React.MutableRefObject<GameState> }>(
  (props, ref) => <DecoyMarkersInner {...props} />
);

function DecoyMesh({ decoyId, stateRef }: { decoyId: string; stateRef: React.MutableRefObject<GameState> }) {
  const meshRef = React.useRef<THREE.Group>(null);

  useFrame(() => {
    const decoy = stateRef.current.decoys.find(d => d.id === decoyId);
    if (!decoy || !meshRef.current) return;
    const [wx, , wz] = toWorld(decoy.x, decoy.y);
    meshRef.current.position.set(wx, 1.5 + Math.sin(Date.now() * 0.004) * 0.3, wz);
    meshRef.current.rotation.y += 0.02;
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <octahedronGeometry args={[0.8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} transparent opacity={0.7} wireframe />
      </mesh>
      <pointLight color="#f59e0b" intensity={2} distance={8} />
    </group>
  );
}
