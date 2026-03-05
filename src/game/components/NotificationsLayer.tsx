import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

export function NotificationsLayer({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = stateRef.current;
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    state.notifications.forEach((notif, i) => {
      if (i >= children.length) return;
      const textMesh = children[i] as any;
      const [wx, , wz] = toWorld(notif.x, notif.y);
      const height = 3 + (2000 - notif.timer) * 0.003;
      textMesh.position.set(wx, height, wz);
      textMesh.visible = true;
      textMesh.fillOpacity = Math.min(1, notif.timer / 500);
      textMesh.color = notif.color;
    });

    for (let i = state.notifications.length; i < children.length; i++) {
      children[i].visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Text
          key={i}
          visible={false}
          fontSize={0.6}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {''}
        </Text>
      ))}
    </group>
  );
}
